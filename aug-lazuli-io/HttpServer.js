/* global Packages */

"use strict";

var Core = require("lapis-core/index.js");
var IO = require("lazuli-io/index.js");
var SQL = require("lazuli-sql/index.js");
var Data = require("lazuli-data/index.js");


module.exports = IO.HttpServer;


module.exports.define("openVCal", function (request, response) {
    var js_session = module.exports.getSession(request);
    var params = module.exports.collectHttpParametersFromJava(request);
    var page = js_session.page_cache[0];
    var field;

    module.exports.debug("---");
    module.exports.info("--- openVCal()" + (js_session ? " on js_session " + js_session.id : "")
        + ", page: " + page.id + (page.page_key ? ":" + page.page_key : "") + " ---");
    module.exports.debug("    parameters: " + Core.Base.view.call(params));
    if (!params.field) {
        module.exports.throwError("No field specified");
    }
    field = page.fields[params.field];
    if (!field) {
        module.exports.throwError("Field not found");
    }
    response.setContentType("text/calendar");
    field.outputVCal(response.getWriter());
});


module.exports.define("renderEmailPreview", function (request, response) {
    var js_session = request.getSession(false).getAttribute("js_session");
    var params = module.exports.collectHttpParametersFromJava(request);
    var page;

    module.exports.debug("---");
    module.exports.info(
        "--- renderEmailPreview()" + (js_session ? " on js_session " + js_session.id : "") +
        ", page: " + params.page_id + (params.page_key ? ":" + params.page_key : "") + " ---"
    );
    if (!js_session) {
        module.exports.throwError({
            id: "not_logged_in",
            text: "Not logged in",
        });
    }
    if (!params.page_id) {
        module.exports.throwError({
            id: "missing_page_id",
            text: "Parameter 'page_id' must be supplied",
        });
    }
    // if (params.page_id !== "ac_email_display") {
    //     module.exports.throwError({
    //         id: "wrong_page",
    //         text: "Page id must be ac_email_display",
    //     });
    // }
    // seconds to allow resource to be cached for, -1 means DON'T CACHE
    module.exports.setCacheHeaders(response, -1);
    page = js_session.getPage(params.page_id, params.page_key);
    response.getWriter().println(page.getPrimaryRow().getBodyWithImagesEmbedded());
});


module.exports.define("fileup", function (request, response) {
    var file_id = module.exports.fileupCore(request, response);
    // Check if file was successfully added (i.e. content type was correct)
    if (file_id >= 0) {
        response.getWriter().println("{ success: true, file_id: " + file_id + " }");
    } else {
        response.getWriter().println("{ success: false }");
    }
});


module.exports.define("fileupHTML", function (request, response) {
    var file_id = module.exports.fileupCore(request);
    var html;

    // Retrieve html content from file
    if (file_id >= 0) {
        html = module.exports.getRow(file_id).getHTMLfromFile();
        html = html.replace(/"/gi, "\\\"");
    }

    // Check if file was successfully added (i.e. content type was correct)
    if (file_id >= 0 && html) {
        response.getWriter().println("{ success: true, file_id: " + file_id + ", html: \"" + html + "\" }");
    } else if (file_id >= 0) {
        response.getWriter().println("{ success: true, file_id: " + file_id + " }");
    } else {
        response.getWriter().println("{ success: false }");
    }
});


module.exports.define("fileupCore", function (request) {
    var js_session = module.exports.getSession(request);
    var filename;
    var content_type;
    var file_id;
    var file_upload;
    var iter;
    var item;
    var stream;

    module.exports.debug("---");
    module.exports.info("--- fileup()" + (js_session ? " on js_session " + js_session.id : "") + " ---");
    module.exports.debug("multipart: " + Packages.org.apache.commons.fileupload.servlet.ServletFileUpload.isMultipartContent(request));
    if (Packages.org.apache.commons.fileupload.servlet.ServletFileUpload.isMultipartContent(request)) {
        file_upload = Packages.org.apache.commons.fileupload.servlet.ServletFileUpload();
        iter = file_upload.getItemIterator(request);
        if (!iter.hasNext()) {
            module.exports.throwError("no form item found in request");
        }
        item = iter.next();
        if (item.isFormField()) {
            module.exports.throwError("form item is ordinary field not file");
        }
        filename = item.getName();
        content_type = item.getContentType();
        stream = item.openStream();
    } else {
        filename = Packages.java.net.URLDecoder.decode(request.getHeader("X-File-Name"), "UTF-8");
        stream = request.getInputStream();
    }
    if (!content_type) {
        content_type = module.exports.getMimeType(filename, request);
    }
    module.exports.info("fileupCore() mime type: " + content_type);
    file_id = Data.entities.get("ac_file").addFile(filename, content_type, stream, js_session, true);
    return file_id;
});


module.exports.define("filedown", function (request, response) {
    var js_session = module.exports.getSession(request);
    var id;
    var conn;
    var resultset;
    var output_stream;

    function accessDenied() {
        var xmlstream;
        var body;
        var div;

        response.setStatus(response.SC_FORBIDDEN, "Access denied");
        xmlstream = IO.XmlStream.clone({
            id: "http_xmlstream",
            name: "html",
            out: response.getWriter(),
            indent: null,
        });
        body = xmlstream.addChild("body");
        div = body.addChild("div", null);
        div.addChild("h1", null, null, "Access denied");
        xmlstream.close();
    }

    module.exports.debug("---");
    module.exports.info("--- filedown()" + (js_session ? " on js_session " + js_session.id : "") + " ---");
    id = request.getParameter("id");

    // module.exports.debug(response);

    if (!js_session || !js_session.allowed_files) {
        accessDenied();
    } else if (!js_session.allowed_files[id]) {
        accessDenied();
    } else {
        conn = SQL.Connection.getQueryConnection("filedown");
        try {
            output_stream = response.getOutputStream();
            resultset = SQL.Connection.shared.executeQuery(
                "SELECT IFNULL(content_type, 'application/octet-stream'), content FROM ac_file WHERE id = " +
                    SQL.Connection.escape(id));
            if (!resultset.next()) {
                module.exports.throwError("file not found");
            }
            response.setContentType(resultset.getString(1));
//    Packages.rsl.FileManager.pipe(resultset.getBinaryStream(2), response.getOutputStream());
            Packages.rsl.FileManager.pipe(
                new Packages.java.io.BufferedInputStream(resultset.getBinaryStream(2)),
                new Packages.java.io.BufferedOutputStream(output_stream));
        } catch (e) {
            module.exports.report(e);
        }
        conn.finishedWithResultSet(resultset);
    }
});


module.exports.define("getMimeType", function (filename, request) {
    var content_type;
    if (request) {
        content_type = String(request.getSession(true).getServletContext().getMimeType(filename));
        if (content_type === "null") {
            content_type = "";
        }
    }
    if (!content_type && filename.match(/\.eml$/)) {
        content_type = "message/rfc822";
    }
    return content_type;
});
