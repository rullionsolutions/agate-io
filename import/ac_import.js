"use strict";

var Data = require("lazuli-data/index.js");
var IO = require("lazuli-io/index.js");
var SQL = require("lazuli-sql/index.js");
var Rhino = require("lazuli-rhino/index.js");
var Access = require("lazuli-access/index.js");


module.exports = Data.Entity.clone({
    id              : "ac_import",
    title           : "Inbound Exchange",
    area            : "ac",
    primary_key     : "id",
    default_order   : "id,id",
    title_field     : "created_at",
    transactional   : false,
    display_page    : true,
    non_parent_link_field: "session_id",
    content_type    : "text/plain",
    data_volume_oom : 5,
});

module.exports.addFields([
    { id: "id"          , label: "Id"               , type: "Number"   , editable: false, list_column: true, search_criterion: true, auto_generate: true, },
    { id: "session_id"  , label: "Session"          , type: "Reference", editable: false, list_column: true, search_criterion: true, ref_entity: "ac_session" },
    { id: "source_url"  , label: "Source Address"   , type: "URL"      , editable: false },
    { id: "http_status" , label: "HTTP Status"      , type: "Text"     , editable: false, list_column: true, data_length: 4 },
    { id: "created_at"  , label: "Created At"       , type: "DateTime" , editable: false, list_column: true  },
    { id: "subtype"     , label: "Subtype"          , type: "Text"     , data_length : 40 },
    { id: "base_record" , label: "Base Record"      , type: "Flex"     , list_column: true, description: "The record to which this message relates" },
    { id: "rqst_headers", label: "Request Headers"  , type: "Textarea" , editable: false },
    { id: "rqst_body"   , label: "Request Body"     , type: "Textarea" , editable: false, search_criterion: true },
    { id: "rpns_headers", label: "Response Headers" , type: "Textarea" , editable: false },
    { id: "rpns_body"   , label: "Response Body"    , type: "Textarea" , editable: false }
]);


module.exports.define("indexes", []);


module.exports.define("subtypes", {});


module.exports.override("archive", function (path, non_destructive, max_trans, max_session) {
    var rows;
    var filename = this.id + ".sql";
    var condition = "session_id  <= " + max_session;

    Rhino.app.dumpMySQLDataThrowOnFail(path + filename, {
        tables: "ac_import",
        where_clause: condition,
    });
    if (!non_destructive) {
        rows = SQL.Connection.shared.executeUpdate("DELETE FROM ac_import WHERE " + condition);
        this.info("Archived " + rows + " rows from " + this.table);
    }
    return filename;
});


module.exports.define("create", function (request, response) {
    var import_row;
    this.session = Access.Session.clone({ user_id: "batch" });
    import_row = this.clone({
        id: String(Data.entities.get("ac_max_key").generate("ac_import", null, null, "id", null, this.session)),
        modifiable: true,
        rpns_headers: {},
        rpns_body   : "",
        rpns_status : "501"         // not implemented
    });
    import_row.processRequest(request);
    import_row.exec();
    import_row.createResponse(response);
    import_row.dbUpdate();
    import_row.execAfter();
    this.session.close();

    return import_row;
});


module.exports.define("execAfter", function () {
    return undefined;
});


module.exports.define("processRequest", function (request) {
    this.rqst_url     = String(request.getRequestURL());
    this.rqst_params  = IO.HttpServer.collectHttpParametersFromJava(request);
    this.rqst_headers = this.getRequestHeaders(request);
    // using indexOf to support //application/json; charset=UTF-8
    if (this.rqst_headers["content-type"] && this.rqst_headers["content-type"].indexOf("application/json") !== -1) {
        this.rqst_params.json_data = IO.HttpServer.collectHttpJSONParam(request);
    }
});


module.exports.define("exec", function () {
    this.rpns_body   = "Hello World";
    this.rpns_status = "200";
    // to be inherited
});


module.exports.define("createResponse", function (response) {
    response.setContentType(this.content_type);
    IO.HttpServer.setCacheHeaders(response, -1);       // seconds to allow resource to be cached for, -1 means DON'T CACHE
    if (this.rpns_body) {
        response.getWriter().println(this.rpns_body);
    }
});


module.exports.define("dbUpdate", function () {
    var base_record,
        sql;

    if (this.base_entity_id && this.base_key) {
        base_record = JSON.stringify({
            id        : "base_record",
            type      : "Reference",
            label     : "Base Record",
            ref_entity: this.base_entity_id,
            val       : this.base_key
        });
    }
    sql = "INSERT INTO ac_import ( _key, id, source_url, subtype, base_record, session_id, created_at, " +
            "rqst_headers, rqst_body, rpns_headers, rpns_body, http_status ) VALUES ( " +
        this.id + ", " + this.id + ", " + SQL.Connection.escape(this.source_url) + ", " +
        SQL.Connection.escape(this.parent.id) + ", " + SQL.Connection.escape(base_record) + ", " +
        (this.session ? this.session.getSessionId() : "NULL") + ", NOW(), " +
        (this.rqst_headers ? SQL.Connection.escape(IO.HttpClient.getStringifiedHeaders(this.rqst_headers)) : "NULL") + ", " +
        (this.rqst_params  ? SQL.Connection.escape(IO.HttpClient.getStringifiedHeaders(this.rqst_params )) : "NULL") + ", " +
        (this.rpns_headers ? SQL.Connection.escape(IO.HttpClient.getStringifiedHeaders(this.rpns_headers)) : "NULL") + ", " +
        SQL.Connection.escape(this.rpns_body) + ", " + SQL.Connection.escape(this.rpns_status) + " )";
    SQL.Connection.shared.executeUpdate(sql);
});


module.exports.define("getRequestHeaders", function (request) {
    var headers = {},
        en,
        header;

    en = request.getHeaderNames();
    while (en.hasMoreElements()) {
        header = en.nextElement();
        headers[String(header)] = String(request.getHeader(header));
    }
    return headers;
});
