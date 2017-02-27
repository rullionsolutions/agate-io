/* global java, Packages */

"use strict";

var Data = require("lazuli-data/index.js");
var IO = require("lazuli-io/index.js");
var SQL = require("lazuli-sql/index.js");
var Rhino = require("lazuli-rhino/index.js");


module.exports = Data.Entity.clone({
    id              : "ac_export",
    title           : "Outbound Exchange",
    area            : "ac",
    primary_key     : "id",
    default_order   : "id,id",
    title_field     : "created_at",
    transactional   : false,
    display_page    : true,
    use_proxy: true,
    non_parent_link_field: "trans_id",
    data_volume_oom : 5,
});


module.exports.addFields([
    { id: "id"          , label: "Id"               , type: "Number"   , list_column: true, search_criterion: true, auto_generate: true, },
    { id: "subtype"     , label: "Subtype"          , type: "Text"     , list_column: true, search_criterion: true, data_length : 40 },
    { id: "action"      , label: "Action"           , type: "Text"     , list_column: true, data_length : 40 },
    { id: "trans_id"    , label: "Transaction"      , type: "Reference", list_column: true, search_criterion: true, ref_entity: "ac_tx" },
    { id: "session_id"  , label: "Session"          , type: "Reference", list_column: true, search_criterion: true, ref_entity: "ac_session" },
    { id: "target_url"  , label: "Target Address"   , type: "URL"       },
    { id: "status"      , label: "Status"           , type: "Option"   , list_column: true, list: "ac.email_status" },
    { id: "http_status" , label: "HTTP Status"      , type: "Text"     , data_length: 4 },
    { id: "status_msg"  , label: "Status Message"   , type: "Text"     , data_length : 255 },
    { id: "base_record" , label: "Base Record"      , type: "Flex"     , list_column: true, description: "The record to which this message relates" },
    { id: "created_at"  , label: "Created At"       , type: "DateTime" , list_column: true  },
    { id: "sent_at"     , label: "Sent At"          , type: "DateTime"  },
    { id: "rqst_headers", label: "Request Headers"  , type: "Textarea"  },
    { id: "rqst_body"   , label: "Request Body"     , type: "Textarea" , search_criterion: true, description: "Indented and header line removed when being displayed" },
    { id: "rpns_headers", label: "Response Headers" , type: "Textarea"  },
    { id: "rpns_body"   , label: "Response Body"    , type: "Textarea" , description: "Indented and header line removed when being displayed" },
    { id: "tech_error"  , label: "Tech Error"       , type: "Textarea" , description: "To record message from Networking issues" }
]);


module.exports.getField("rqst_body").override("getTextFromVal", function () {
    var out = Data.Textarea.getTextFromVal.call(this);
    if (out) {
        out = IO.XmlStream.escape(out);
    }
    return out;
});


module.exports.getField("rpns_body").override("getTextFromVal", function () {
    var out = Data.Textarea.getTextFromVal.call(this);
    if (out) {
        out = String(IO.JSoup.parse(out));  // uses jsoup to indent
        out = IO.XmlStream.escape(out);
    }
    return out;
});


module.exports.define("indexes", [ "id", "subtype" ]);


module.exports.define("subtypes", {});


module.exports.override("archive", function (path, non_destructive, max_trans, max_session) {
    var rows;
    var filename = this.id + ".sql";
    var condition = "session_id <= " + max_session;

    Rhino.app.dumpMySQLDataThrowOnFail(path + filename, {
        tables: "ac_export",
        where_clause: condition,
    });
    if (!non_destructive) {
        rows = SQL.Connection.shared.executeUpdate("DELETE FROM ac_export WHERE " + condition);
        this.info("Archived " + rows + " rows from " + this.table);
    }
    return filename;
});

module.exports.define("create_only", function (options) {
    var export_row;
    options.id = String(Data.entities.get("ac_max_key").generate("ac_export", null, null, "id", null, options.session));
    options.modifiable = true;
    options.instance = true;
    export_row = this.clone(options);
    return export_row;
});


module.exports.define("create", function (options) {
    var export_row;
    options.id = String(Data.entities.get("ac_max_key").generate("ac_export", null, null, "id", null, options.session));
    options.modifiable = true;
    options.instance = true;
    export_row = this.clone(options);
    export_row.request_headers = export_row.setRequestHeaders();
    export_row.payload = export_row.composeRequestBody();
    export_row.checkMinimumRequirement();
    export_row.exec();
    export_row.execAfter();
    return export_row;
});


module.exports.define("addResponseField", function (parent, field, value) {
    return undefined;
});


module.exports.define("createResponse", function (parent, structure, rows) {
    var response,
        that = this;

    structure.forEach(function (value) {
        if (typeof that[value.name] === "function") {
            response = that[value.name](rows, parent);
            if (typeof response === "object" && value.sub_rows) {
                if (value.attr) {
                    value.attr.forOwn(function (key, value) {
                        if (typeof that[value.name + "_" + key] === "function") {
                            that[value.name + "_" + key](response, rows);
                        } else if (typeof value === "string") {
                            response.attribute(key, value);
                        }
                    });
                }
                that.createResponse(response, value.sub_rows, rows);
            } else {
                that.addResponseField(parent, value.name, response);
            }
        } else if (value.attr || value.sub_rows) {
            response = that.addResponseField(parent, value.name);
            if (value.attr) {
                value.attr.forOwn(function (key, attr) {
                    if (typeof that[value.name + "_" + key] === "function") {
                        that[value.name + "_" + key](response, key, rows);
                    } else if (typeof attr === "string") {
                        response.attribute(key, attr);
                    }
                });
            }
            if (value.sub_rows) {
                that.createResponse(response, value.sub_rows, rows);
            }
        } else {
            this.error(this, value.name + " is not a function");
        }
    });
});


module.exports.define("checkMinimumRequirement", function (object) {
    object = object || this;
    if (!object.url || !object.method || (object.method !== "GET" && !object.payload)) {
        this.throwError("ac_export minimum requirement are url, payload, method");
    }
});


module.exports.define("base64File", function (file_row) {
    var base64_invoice = "",
        encoder,
        resultset,
        bytes,
        io;

    resultset = SQL.Connection.shared.executeQuery(
            "SELECT content_type, content FROM ac_file WHERE id=" + SQL.Connection.escape(file_row.getField("id").get()) + " AND content is not null");

    if (resultset.next()) {
        bytes       = java.lang.reflect.Array.newInstance(java.lang.Byte.TYPE, parseInt(file_row.getField("length").getNumber(0) * 1000, 10));
        io          = new java.io.DataInputStream(resultset.getBinaryStream(2));
        io.readFully(bytes);
        encoder = new Packages.sun.misc.BASE64Encoder();
        base64_invoice = encoder.encode(bytes).replaceAll("\n", "").replaceAll("\r", "");
        resultset.getStatement().close();
    } else {
        this.throwError({ id: "file_not_found", file_id: file_row.getField("id").get() });
    }
    return String(base64_invoice);
});


module.exports.define("getHttpClient", function () {
    if (this.parent === Data.Entity) {
        this.throwError({ id: "called_at_wrong_level" });
    }
    if (!this.http_client) {
        this.http_client = IO.HttpClient.clone(this);
        if (this.url) {
            this.http_client.url = this.url;
        }
        if (typeof this.use_proxy === "boolean") {
            this.http_client.use_proxy = this.use_proxy;
        }
    }
    return this.http_client;
});


module.exports.define("setRequestHeaders", function () {
    return {};
});


// stub to be overridden
module.exports.define("composeRequestBody", function () {
    return "";
});


// stub to be overridden
module.exports.define("getRecordRows", function () {
    return {};
});


// stub to be overridden
module.exports.define("execAfter", function () {
    return undefined;
});


module.exports.define("buildSOAP", function (elements, parent, rows) {
    var that = this;
    elements.forEach(function (value) {
        var el = that[value.name](parent, rows, value.sub_rows);
        if (el) {
            that.buildSOAP(value.sub_rows, el, rows);
        }
    });
});


module.exports.define("addSoapAttributes", function (request) {
    return undefined;
});


module.exports.define("getSOAP", function (byte_array) {
    var request,
        out = new java.io.PrintStream(byte_array);

    request = IO.XmlStream.clone({
        id    : "out_xmlstream",
        name  : "SOAP-ENV:Envelope",
        out   : out,
        indent: 1,
        soap  : true
    });

    request.attribute("xmlns:SOAP-ENV", 'http://schemas.xmlsoap.org/soap/envelope/');
    this.addSoapAttributes(request);
    return request;
});


module.exports.define("composeSoapBody", function () {
    var request,
        body,
        out = new java.io.ByteArrayOutputStream(),
        record_rows;

    if (this.request_body) {
        return this.request_body;
    }

    this.xml_charset = this.xml_charset || "utf-8";

    record_rows = this.getRecordRows();
    request = this.getSOAP(out);
    if (!this.no_soap_body) {
        this.buildSOAP(this.structure, request, record_rows);
    }
    request.close();

    body = "<?xml version=\"1.0\" encoding=\"" + this.xml_charset + "\"?>" + out.toString("UTF-8");

    return  body;
});


module.exports.define("exec", function () {
    var response,
        http_client;

    this.dbUpdateBeforeExport();
    http_client = this.getHttpClient();
    if (this.test_response) {
        http_client.response = this.test_response;
        this.getField("rpns_body").set(http_client.response.body);
    } else {
        http_client.exec();
    }

    response = http_client.response;
    this.dbUpdateAfterExport(response);
});


module.exports.define("dbUpdateBeforeExport", function () {
    var base_record = null,
        trans_id    = null,
        payload,
        session_id,
        request_headers,
        sql;

    request_headers = (this.request_headers ? SQL.Connection.escape(this.getHttpClient().getStringifiedHeaders(this.request_headers)) : "NULL");
    session_id      = (this.session ? this.session.getSessionId() : "NULL");

    if (this.base_entity_id && this.base_record_key) {
        base_record = JSON.stringify({
            id        : "base_record",
            type      : "Reference",
            label     : "Base Record",
            ref_entity: this.base_entity_id,
            val       : this.base_record_key
        });
        trans_id = this.base_record_row.trans.id;
    }

    payload = this.payload;
    if (payload && this.redaction_regex) {
        payload = payload.replace(this.redaction_regex, function (group0, group1) {
            return group0.replace(group1, "{REDACTED}");
        });
    }

    sql = "INSERT INTO ac_export ( _key, id, target_url, subtype, action, base_record, trans_id, session_id, rqst_headers, rqst_body, created_at, status) VALUES ( "
        + this.id                      + ", "
        + this.id                      + ", "
        + SQL.Connection.escape(this.url)       + ", "
        + SQL.Connection.escape(this.parent.id) + ", "
        + SQL.Connection.escape(this.action)    + ", "
        + SQL.Connection.escape(base_record)    + ", "
        + trans_id                     + ", "
        + session_id                   + ", "
        + request_headers              + ", "
        + SQL.Connection.escape(payload)        + ", "
        + "now(), 'N')";

    SQL.Connection.shared.executeUpdate(sql);
});


module.exports.define("dbUpdateAfterExport", function (response) {
    var sql;
    var http_client = this.getHttpClient();
    var http_status = String(response.code || "");
    var status_msg = response.msg ? String(response.msg || "") : "";
    var tech_error = response.tech_error ? String(response.tech_error || "") : "";
    var status = http_status[0] === "2" ? "S" : "F";
    var rqst_headers = this.request_headers ?
        String(http_client.getStringifiedHeaders(this.request_headers) || "") : "";
    var rpns_headers = response.headers ?
        String(http_client.getStringifiedHeaders(response.headers) || "") : "";
    var rpns_body = String(response.body || "");

    sql = "UPDATE ac_export"
        + "   SET status  = " + SQL.Connection.escape(status)
        + ", http_status  = " + SQL.Connection.escape(http_status)
        + ", status_msg   = " + SQL.Connection.escape(status_msg)
        + ", rqst_headers = " + SQL.Connection.escape(rqst_headers)
        + ", rpns_body    = " + SQL.Connection.escape(rpns_body)
        + ", rpns_headers = " + SQL.Connection.escape(rpns_headers)
        + ", tech_error   = " + SQL.Connection.escape(tech_error)
        + " WHERE    _key = " + SQL.Connection.escape(this.id);

    SQL.Connection.shared.executeUpdate(sql);

    this.getField("status").set(status);
    this.getField("http_status").set(http_status);
    this.getField("rqst_headers").set(rqst_headers);
    this.getField("rpns_body").set(rpns_body);
    this.getField("rpns_headers").set(rpns_headers);
    this.getField("tech_error").set(tech_error);
});
