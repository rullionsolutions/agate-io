/* global  Packages */

"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");
var Rhino = require("lazuli-rhino/index.js");


module.exports = Data.Entity.clone({
    id              : "ac_file",
    title           : "File",
    area            : "ac",
    primary_key     : "id",
    default_order   : "id,id",
    title_field     : "title",
    transactional   : false,
    display_page    : true,
    autocompleter   : true,
    text_summary_length: 17000,
    data_volume_oom : 5,
});

module.exports.addFields([
    { id: "url"         , label: "Link to File"  , type: "URL"      , editable: false, list_column: true, sql_function: "id", url_target: "_blank", },
    { id: "id"          , label: "Id"            , type: "Number"   , editable: false, list_column: true, search_criterion: true, auto_generate: true, },
    { id: "title"       , label: "File Title"    , type: "Text"     , mandatory: true, list_column: true, search_criterion: true, data_length: 255 },
    { id: "create_dttm" , label: "Uploaded At"   , type: "DateTime" , editable: false, list_column: true  },
    { id: "content_type", label: "Content Type"  , type: "Text"     , editable: false, data_length: 255 },
    { id: "content"     , label: "Content"       , type: "Binary"   , editable: false, visible: false },
    { id: "session_id"  , label: "Session"       , type: "Reference", editable: false, ref_entity: "ac_session" },
    { id: "length"      , label: "Size"          , type: "Number"   , editable: false, list_column: true, aggregation: "S", display_format: "0.0 KB", decimal_digits: 3 },
    { id: "text_content", label: "Text Content"  , type: "Textarea" , editable: false, css_richtext: true }
]);


module.exports.define("indexes", [ "session_id, id", "id" ]);


module.exports.define("getByteArrayContent", function () {
    var resultset;
    try {
        resultset = SQL.Connection.shared.executeQuery(
            "SELECT content FROM ac_file WHERE _key=" + SQL.Connection.escape(this.getKey()));
        if (!resultset.next()) {
            this.throwError({
                id: "file_not_found",
                file_id: this.getKey(),
            });
        }
        return resultset.getBytes(1);
    // } catch (exc) {
    //     this.report(exc);
    //     return exc;
    } finally {
        SQL.Connection.shared.finishedWithResultSet(resultset);
    }
});

module.exports.define("createFileDataSourceFromContent", function () {
    var dataSource = new Packages.javax.mail.util.ByteArrayDataSource(
        this.getByteArrayContent(), this.getField("content_type").get());
    return dataSource;
});

module.exports.override("slimDataForTesting", function () {
    SQL.Connection.shared.executeUpdate("UPDATE ac_file SET content = NULL");
});


module.exports.getField("url").override("getURLFromVal", function () {
    if (!this.owner.page.session.allowed_files) {
        this.owner.page.session.allowed_files = {};
    }
    this.owner.page.session.allowed_files[this.get()] = true;
    return "file/" + encodeURIComponent(this.owner.getField("title").get()) +
        "?mode=filedown&id=" + this.get();
});


module.exports.define("addFile", function (filename, content_type, input_stream, session, html_out) {
    var id;
    var prepared_statement;
    var path_regex = /(.*[/\\])+/;
    // var success;
    var html;
    var file_row;
    var connection = SQL.Connection.clone({
        id: "addFile",
        auto_commit: false,
        retain_connection: true,
        isolation_level: "READ COMMITTED",
        execution_retries: 0
    });

    filename = String(filename).replace(path_regex, "");

    try {
        file_row = module.exports.cloneAutoIncrement({}, {
            session_id  : session.getSessionId(),
            title       : filename,
            content_type: content_type
        });
        id = file_row.getKey();
        if (this.getStorageEngine() !== "MEMORY") {
            prepared_statement = connection.prepareStatement("UPDATE ac_file SET content=? WHERE id=?");
            prepared_statement.setBlob(1, input_stream);
//            prepared_statement.setBlob(1, new java.util.zip.DeflaterInputStream(input_stream));
            prepared_statement.setString(2, id);
            prepared_statement.executeUpdate();
            prepared_statement.clearParameters();
            connection.executeUpdate("UPDATE ac_file SET length=length(content) WHERE id = " + SQL.Connection.escape(id));
        }

        if (html_out) {
            this.debug(this, "Retrieving formatted text from file: " + id);
            this.debug(connection.conn);
            html = Packages.rsl.FileManager.getFormattedExtract(connection.conn, id);
            html = Core.Format.snippetHTML(html, this.text_summary_length);
            prepared_statement = connection.prepareStatement("UPDATE ac_file SET text_content=? WHERE id=?");
            prepared_statement.setString(1, html);
            prepared_statement.setString(2, id);
            prepared_statement.executeUpdate();
            prepared_statement.clearParameters();
            // success = (typeof html === "string" && html.length > 0);
        } else {
            this.debug(this, "Retrieving plain text from file: " + id);
            /* success =*/ Packages.rsl.FileManager.storeTextExtract(connection.conn, id);
        }
        connection.executeUpdate("COMMIT");
        return id;
    } catch (e) {
        try {
            if (connection) {
                connection.executeUpdate("ROLLBACK");
            }
        } catch (e2) {
            this.report(e2);
        }
        this.report(e);
        return -1;
    } finally {
        connection.finishedWithPreparedStatement(prepared_statement);
    }

/*
    // RUL-021-5 - Only commit file if tika extract successful.
    try {
        conn = x.sql.getConnection(true);
    } catch (e2) {
    } finally {
        SQL.Connection.finishedWithConnection(conn);
    }
    if (success) {
        return id;
    } else {
        SQL.Connection.shared.executeUpdate("DELETE FROM ac_file WHERE id=" + id);
    }
*/
});

/* TODO - not yet working - trying to pack/unpack binary file data using Base64 encoding...
module.exports.getField("content").setFromResultSet = function (resultset) {
    try {
        this.setInitial(Packages.rsl.Lib.toBase64(resultset.getBytes(this.query_column)));
    } catch (e) {
        this.report(e);
    }
};
*/

module.exports.define("addDiskFile", function (filepath, content_type, session) {
    var file = new Packages.java.io.File(filepath);
    if (!file.exists()) {
        this.throwError({ id: "file_not_found", filepath: filepath });
    }
    return this.addFile(file.getName(), content_type, new Packages.java.io.FileInputStream(file), session);
});


module.exports.define("getInputStream", function () {
    var resultset,
        binaryStream;

    try {
        resultset = SQL.Connection.shared.executeQuery(
            "SELECT title, content_type, content FROM ac_file WHERE _key=" + SQL.Connection.escape(this.getKey()));
        if (!resultset.next()) {
            this.throwError({ id: "file_not_found", file_id: this.getKey() });
        }
        binaryStream = resultset.getBinaryStream(3); // get stream before closing resultset
    // } catch (e) {
    //     this.report(e);
    } finally {
        SQL.Connection.shared.finishedWithResultSet(resultset);
    }
    return binaryStream;
});


module.exports.define("processTextFile", function (lineCallback, line_limit) {
    var resultset,
        reader,
        line,
        line_nbr = 0,
        response;

    try {
        resultset = SQL.Connection.shared.executeQuery(
            "SELECT title, content_type, content FROM ac_file WHERE _key=" +
                SQL.Connection.escape(this.getKey()));
        if (!resultset.next()) {
            this.throwError({ id: "file_not_found", file_id: this.getKey() });
        }
        reader = new Packages.java.io.BufferedReader(new Packages.java.io.InputStreamReader(resultset.getBinaryStream(3)));
        line   = reader.readLine();
        while (line || typeof line === "string") {
            line_nbr += 1;
            line += "";        // convert to JS string
            this.debug(this, "Read line: " + line_nbr + " as: " + line);
            response = lineCallback(line, line_nbr);
            if (response === false || (typeof line_limit === "number" && line_nbr > line_limit)) {
                break;
            }
            line = reader.readLine();
        }
    } catch (exc) {
        this.report(exc);
        exc.line_nbr = line_nbr;
        try {
            reader.close();
        } catch (e) {
            this.trace(e);
        }
        return exc;
    } finally {
        SQL.Connection.shared.finishedWithResultSet(resultset);
    }
    return line_nbr;
});


module.exports.define("archiveBinaryData", function (path, non_destructive, days_ago) {
    var filename = this.id + ".sql";
    Rhino.app.dumpMySQLDataThrowOnFail(path + filename, {
        tables: "ac_file",
        where_clause: "content IS NOT NULL AND DATE(create_dttm) < DATE_SUB(DATE(NOW()), INTERVAL " + days_ago + " DAY)",
    });
    if (!non_destructive) {
        SQL.Connection.shared.executeUpdate("UPDATE ac_file SET content = NULL WHERE content IS NOT NULL AND DATE(create_dttm) < DATE_SUB(DATE(NOW()), INTERVAL " + days_ago + " DAY)" );
    }
    return filename;
});
