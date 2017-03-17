/* global Packages */

"use strict";

var Core = require("lapis-core/index.js");
var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");
var IO = require("lazuli-io/index.js");
var Rhino = require("lazuli-rhino/index.js");

module.exports = Data.Entity.clone({
    id: "ac_email",
    title: "Email",
    area: "ac",
    primary_key: "id",
    default_order: "id,id",
    title_field: "subject",
    transactional: false,
    display_page: true,
//    autocompleter: true,
//    parent_entity: "ac_session",
    non_parent_link_field: "session_id",
    email_header: "Dear ",
    email_footer: "<br/><br/>Kind Regards,<br/>" + Rhino.app.product_name,
    use_html_format: true,
    use_base64_cids: false,
    cids: Core.OrderedMap.clone({
        id: "email_cids",
    }),
    template_map: Core.OrderedMap.clone({
        id: "template_map",
    }),
    attached_files: [],
    data_volume_oom : 5,
});

module.exports.addFields([
    {
        id: "id",
        label: "Id",
        type: "Number",
        editable: false,
        list_column: true,
        search_criterion: true,
        auto_generate: true,
    },
    {
        id: "session_id",
        label: "Session",
        type: "Reference",
        editable: false,
        list_column: true,
        search_criterion: true,
        ref_entity: "ac_session",
    },
    {
        id: "to_addr",
        label: "To Address",
        type: "Email",
    },
    {
        id: "to_user",
        label: "Recipient User",
        type: "Reference",
        list_column: true,
        search_criterion: true,
        ref_entity: "ac_user",
    },
    {
        id: "status",
        label: "Status",
        type: "Option",
        editable: false,
        list_column: true,
        list: "ac.email_status",
    },
    {
        id: "status_msg",
        label: "Status Message",
        type: "Textarea",
        editable: false,
    },
    {
        id: "subject",
        label: "Subject",
        type: "Text",
        list_column: true,
        data_length: 255,
    },
    {
        id: "page",
        label: "Page",
        type: "Text",
        editable: false,
        data_length: 40,
        config_item: "pages",
    },
    {
        id: "created_at",
        label: "Created At",
        type: "DateTime",
        editable: false,
    },
    {
        id: "sent_at",
        label: "Sent At",
        type: "DateTime",
        editable: false,
    },
    {
        id: "text_string",
        label: "Text Label",
        type: "Text",
        data_length: 40,
        // type: "Reference",
        editable: false,
        // ref_entity: "sy_text",
    },
    {
        id: "body",
        label: "Body Text",
        type: "Textarea",
        css_type: "rich_email",
    },
    {
        id: "attach_content_type",
        label: "Attachment Content Type",
        type: "Text",
        data_length: 40,
        editable: false,
    },
    {
        id: "attach_data",
        label: "Attachment Data",
        type: "Textarea",
        editable: false,
    },
    {
        id: "attached_files",
        label: "Attached Files",
        type: "Textarea",
        editable: false,
        visible: false,
    },
]);


module.exports.define("populateArrayWithRegexpMatches", function (found_matches, reg_exp, source) {
    var match_str;
    var match_array;
    var getMatch = function (regex) {
        match_array = regex.exec(source);
        return (match_array !== null);
    };

    found_matches = found_matches || [];

    while (getMatch(reg_exp)) {
        match_str = match_array[0] && match_array[0].trim();
        if (match_str && found_matches.indexOf(match_str) === -1) {
            found_matches.push(match_array[0]);
        }
    }
});


/**
 * [description] Used to match plain text url to htmlify after
 * @param  source_text
 * @return unique url array
 */
module.exports.define("extractURLArray", function (text) { // duplicate urls are supported
    var source = (text || "").toString();
    var url_array = [];
    var reg_exp_list = [
        /(((ftp|https?):\/\/)[-\w@:%_+.~#?,&//=]+)/g, // links
        /((mailto:)?[_.\w-]+@([\w][\w-]+\.)+[a-zA-Z]{2,3})/g, // emails
    ];
    // catch all the url plain and html
    reg_exp_list.forEach(function (reg_exp) {
        this.populateArrayWithRegexpMatches(url_array, reg_exp, source);
    }, this);

    return url_array;
});


module.exports.define("extractHTMLURLArray", function (text) { // duplicate urls are supported
    var source = (text || "").toString();
    var html_url_array = [];

    this.populateArrayWithRegexpMatches(
        html_url_array,
        /<a[\s]+([^>]+)>((?:.(?!<\/a>))*.)<\/a>/g,
        source
    );

    return html_url_array;
});


module.exports.define("plainTextURLToHTMLURL", function (url_id, plain_url) {
    var jsoup_package = Packages.org.jsoup;
    var html_url;
    var href = plain_url.trim();
    var url_text = href;
    if (href.indexOf("@") !== -1) {
        href = "mailto:" + href;
    }
    url_text = jsoup_package.Jsoup.clean(url_text, jsoup_package.safety.Whitelist.none());
    html_url = "<a id='" + url_id + "' href='" + href + "'>" + url_text + "</a>";
    return html_url;
});


module.exports.define("escapeRegExp", function (text) {
    return text.replace(/([.*+?^=!:${}()|[\]/\\])/g, "\\$1");
});


module.exports.define("replacePlainTextURLs", function (text) {
    var email_row = this;
    var url_array;
    var html_url_array;
    var local_text = text;
    var plain_url_pos = 0;

    if (this.use_html_format) {
        url_array = this.extractURLArray(local_text) || [];
        html_url_array = this.extractHTMLURLArray(local_text) || [];
        html_url_array.forEach(function (html_url, pos) {
            local_text = local_text.replace(html_url, "____html____" + pos);
        });
        url_array.forEach(function (url) {
            if (local_text.indexOf("____url____" + plain_url_pos) === -1) {
                local_text = local_text.replace(new RegExp(email_row.escapeRegExp(url), "g"), function () {
                    var url_id = "____url____" + plain_url_pos;
                    var replacement = email_row.plainTextURLToHTMLURL(url_id, url);
                    plain_url_pos += 1;
                    return replacement;
                });
            }
        });
        html_url_array.forEach(function (html_url, pos) {
            local_text = local_text.replace("____html____" + pos, html_url);
        });
    }

    return local_text;
});


module.exports.define("replaceCidTokens", function (text) {
    this.cids.each(function (cid) {
        if (text.indexOf(cid.cid_uri) !== -1) {
            text = text.split(cid.cid_uri).join(cid.data_uri);
        }
    });
    return text;
});


module.exports.define("getBodyWithImagesEmbedded", function () {
    return this.replaceCidTokens(this.getField("body").get());
});


module.exports.getField("body").override("renderUneditable", function (elem) { // render_opts, inside_table) {
    var preview_url =
        Rhino.app.base_uri +
        "dyn/?mode=renderEmailPreview&page_id=ac_email_display&page_key=" +
        this.owner.getKey();
    var style = this.getUneditableCSSStyle();
    var text = this.getText();
    var getIframeCode = function (iframe_html) {
        var outer_html =
            "<iframe id='email_preview'  title='Email Preview' " +
            "style='width:100%; height: 300px' " +
            "scrolling='no' frameborder='0' " +
            "src='" + preview_url + "' " +
            "onload='(function () { $(\"#email_preview\").height($($(\"#email_preview\")[0].contentWindow.window.document).height())})()'" +
            "/>";
        return outer_html;
    };
    if (style) {
        elem.attribute("style", style);
    }
    if (text) {
        this.owner.cids.each(function (cid) {
            if (text.indexOf(cid.cid_uri) !== -1) {
                text = text.split(cid.cid_uri).join(cid.data_uri);
            }
        });

        elem.text(getIframeCode(text), true, true);
    }
});


module.exports.define("indexes", [
    "id",
    "session_id, id",
    "to_user",
]);

module.exports.cids.addAll([
    Core.Base.clone({
        id: "email_logo",
        label: "MyR logo",
        image: "style/logo.png",
        type: "image/png",
    }),
]);

module.exports.define("getCid", function (email, cid_id) {
    var cid = this.cids.get(cid_id);
    var getByteArrayDataSource = Packages.javax.mail.util.ByteArrayDataSource;
    return String(
        email.embed(
            getByteArrayDataSource(cid.cid_bytes, cid.type),
            cid.label
        )
    );
});

module.exports.define("embedCidData", function (email) {
    var getByteArrayDataSource = Packages.javax.mail.util.ByteArrayDataSource;
    var this_email = this;
    this.cids.each(function (cid) {
        if (this_email.body.indexOf(cid.cid_uri) !== -1) {
            email.embed(
                getByteArrayDataSource(cid.cid_bytes, cid.type),
                cid.label,
                cid.cid_key
            );
        }
    });
});

module.exports.define("addCidTokensToMap", function (token_map) {
    var this_email = this;
    this.cids.each(function (cid) {
        var cid_key = cid.id;
        var cid_value = cid.cid_uri;
        if (this_email.use_base64_cids) {
            cid_value = cid.data_uri;
        }
        token_map[cid_key] = cid_value;
    });
});

/**
 * used to look up files in ac/email/template/
 * or if overridden in overlays/ac/email/template/
 */
module.exports.define("getFullTemplate", function (template_id) {
    var this_email = this;
    var result = [];

    this.template_map.get(template_id).template_part_arr.each(function (template_part) {
        result.push(template_part.getText(this_email, this_email.body));
    });

    return result.join("");
});

module.exports.template_map.addAll([
    Core.Base.clone({
        id: "system",
        label: "Vanilla System Template",
        template_part_arr: Core.OrderedMap.clone({
            id: "template_part_arr",
        }),
    }),
]);

/**
 * Example template blue print.
 * The dev is free to decide where to add the core txt piece of an email
 * by returning the email_base_text.
 * In this template I return it in the middle of header and footer
 * with URLs replaced.
 */
module.exports.template_map.get("system").template_part_arr.addAll([
    Core.Base.clone({
        id: "header",
        file_name: "header.html",
        text: "", // loaded after
        getText: function (email_row, email_base_text) {
            return this.text;
        },
    }),
    Core.Base.clone({
        id: "body",
        file_name: "",
        text: "", // loaded after
        getText: function (email_row, email_base_text) {
            return email_row.replacePlainTextURLs(email_base_text);
        },
    }),
    Core.Base.clone({
        id: "footer",
        file_name: "footer.html",
        text: "", // loaded after
        getText: function (email_row, email_base_text) {
            return this.text;
        },
    }),
]);

module.exports.define("loadEmailCIDMap", function () {
    var root_path = Rhino.app.getProjectRootDir();
    module.exports.cids.each(function (cid) {
        var encoder = Packages.org.apache.commons.codec.binary.Base64(true); // true means URL safe
        var decoder;
        var image;
        var io;
        var bytes;

        if (cid.base64) {
            decoder = new Packages.sun.misc.BASE64Decoder();
            bytes = decoder.decodeBuffer(cid.base64);
        } else if (cid.image) {
            image = new Packages.java.io.File(root_path + "/" + cid.image);
            io = new Packages.java.io.DataInputStream(new Packages.java.io.FileInputStream(image));
            bytes = Packages.java.lang.reflect.Array.newInstance(
                Packages.java.lang.Byte.TYPE,
                parseInt(image.length(), 10)
            );
            io.readFully(bytes);
            io.close();
        }
        cid.cid_bytes = bytes;
        cid.cid_key = cid.id + "_cid";
        cid.cid_uri = "cid:" + cid.cid_key;
        // that will allow us to:
        // have a valid html email that works on both email client and browser
        // use the map item id in the template and detokenize before
        cid.data_uri = "data:" + cid.type + ";base64," + encoder.encodeBase64String(bytes);
    });
});

module.exports.define("isDomainInWorkValidList", function (domain) { // C10611
    var valid_domains = Data.areas.get("ac").params.valid_work_email_domains;
    return (valid_domains.length === 0 || valid_domains.indexOf(domain) > -1);
});


module.exports.define("isValidWorkEmailDomain", function (email) {   // C10611
    var domain = email.split("@")[1];
    return this.isDomainInWorkValidList(domain);
});

module.exports.define("loadEmailTemplateMap", function () {
    this.template_map.each(function (template_obj) {
        function loadPartFile(tmpl_file_path) {
            var str;
            if (IO.File.exists(tmpl_file_path)) {
                str = IO.File.readFile(tmpl_file_path);
            }
            return str;
        }
        template_obj.template_part_arr.each(function (template_part_obj) {
            var file_name;

            if (template_part_obj.file_name) {
                file_name = "/template/"
                          + template_obj.id + "/"
                          + template_part_obj.file_name;
                template_part_obj.text = loadPartFile(Rhino.app.emerald_dir + "overlays/email/" + file_name);
                if (!template_part_obj.text) {  // or default
                    template_part_obj.text = loadPartFile(IO.File.getModulePath(module) + file_name);
                }
            }
        });
    });
});

Rhino.app.defbind("emailCids", "loadEnd", function () {
    module.exports.loadEmailCIDMap();
    module.exports.loadEmailTemplateMap();
});
/** End embed functionality */

module.exports.define("copyBaseSpec", function () { // transactional
    return {
        session: this.trans.session,
        page: this.page,
        subject: this.getField("subject").getText(),
        body: this.getField("body").getText(),
        text_string: this.getField("text_string").get(),
        attached_files: JSON.parse(this.getField("attached_files").get() || "[]"),
    };
});

module.exports.define("create", function (options) {
    var email_row = this.createPerUser(options);
    var query;

    if (options.include_delegates) {
        if (!options.to_user) {
            this.throwError({
                id: "invalid_option",
                text: "'include_delegates' parameter specified with blank 'to_user' property",
            });
        }
        email_row.delegates_email_rows = [];
        query = Data.entities.get("ac_user_deleg").getQuery();
        query.addCondition({
            column: "A.delegater",
            operator: "=",
            value: options.to_user,
        });
        query.addCondition({
            column: "A.get_ntfcns",
            operator: "=",
            value: "Y",
        });
        while (query.next()) {
            options.to_user = query.getColumn("A.delegatee").get();
            email_row.delegates_email_rows.push(this.createPerUser(options));
        }
        query.reset();
    }
    return email_row;
});


module.exports.define("createPerUser", function (options) {
    var email_row;
    email_row = module.exports.cloneAutoIncrement(options, {
        session_id : options.session.getSessionId(),
        page       : (options.page && options.page.id) || "",
        to_user    : options.to_user || "",
        status     : options.status || "D",
        status_msg : "Not tried to send",
        created_at : "now",
    });
    email_row.id = email_row.getKey();
    email_row.attached_files = options.attached_files || [];
    email_row.populateFromUser();
    email_row.populateFromTextString();
    email_row.updateRecord(false);
    if (email_row.page) {
        email_row.page.addEmailRow(email_row);
    }
    // email_row.initialize();
    return email_row;
});

module.exports.define("populateFromUser", function () {
    var user_row;

    if (this.to_user) {
        if (this.trans && this.trans.isInCache("ac_user", this.to_user)) {
            user_row = this.trans.getActiveRow("ac_user", this.to_user);
        } else {
            user_row = Data.entities.get("ac_user").getRow(this.to_user);
        }

        if (user_row.getField("email_verification").get() === "R") {
            this.fatal("User's '" + user_row.getKey() + "' email address is repudiated");
            this.session.messages.add({
                type: "W",
                text: "Users '" + user_row.getKey() + "' email address is not verified",
            });
            this.repudiated = true;
        }

        this.user_name = this.user_name || user_row.getField("name").get();
        this.to_addr = this.to_addr || user_row.getField("email").get();
    }

    if (typeof this.to_addr !== "string") {
        this.throwError({
            id: "invalid_option",
            text: "'to_addr' parameter is missing or not a string",
            text_string: this.text_string,
        });
    }

    if (this.user_name) {
        this.nice_name = this.nice_name || Core.Format.convertNameFirstSpaceLast(this.user_name);
        this.first_name = this.first_name || Core.Format.convertNameFirstOnly(this.user_name);
        this.last_name = this.last_name || Core.Format.convertNameLastOnly(this.user_name);
    }
    // C9625
    this.email_header = this.nice_name ? this.email_header + this.nice_name + ",<br/>" : "";
});


module.exports.define("populateFromTextString", function () {
    var text_string;
    if (this.text_string) {
        text_string = Data.entities.get("sy_text").getText(this.text_string);
        if (!text_string) {
            this.throwError("unrecognized text string: " + this.text_string);
        }
        this.subject = this.subject || text_string.text;
        this.body = this.body || text_string.detail;
        if (text_string.calendar_event) {
            this.event_digest = this.event_title;
            this.attach_content_type = "text/calendar";
            this.attach_data = Core.Format.getVCalString(this);
        }
    }
    this.app_title = this.app_title || Rhino.app.title;
    this.app_id = Rhino.app.app_id;
    this.email_id = this.id;
    this.base_uri = this.base_uri || Rhino.app.base_uri;
    this.product_name = this.product_name || Rhino.app.product_name;
    this.client_name = this.client_name || (Rhino.app.client && Rhino.app.client.organization_name);
    if (typeof this.subject !== "string") {
        this.throwError({
            id: "invalid_option",
            text: "'subject' parameter is missing or not a string",
            text_string: this.text_string,
        });
    }
    if (typeof this.body !== "string") {
        this.throwError({
            id: "invalid_option",
            text: "'body' parameter is missing or not a string",
            text_string: this.text_string,
        });
    }
    if (this.use_html_format) {
        this.populateHTML();
    } else {
        this.populateText();
    }
});

module.exports.define("getHTMLTemplateID", function () {
    return "system";
});

module.exports.define("populateHTML", function () {
    var body_template;
    // detokenize the text body in order to allow URL replacement
    this.body = this.detokenize(this.body.replace(/\n/g, "<br>"), Core.Base.replaceToken);
    // wrap the body with the html template
    body_template = this.getFullTemplate(this.getHTMLTemplateID());
    // adds the cids to use them as token
    this.addCidTokensToMap(this);
    // detokenize again the final html
    this.body = this.detokenize(body_template, Core.Base.replaceToken);
    // detokenize the subject
    this.subject = this.detokenize(this.subject, Core.Base.replaceToken);
});

module.exports.define("populateText", function () {
    if (!this.suppress_footer_ident) {
        this.body += "\n\nRullion myRecruiter email id: {app_id}/{email_id}";
    }
    this.subject = this.detokenize(this.subject, Core.Base.replaceToken);
    this.body = this.detokenize(this.body, Core.Base.replaceToken);
});

/*
module.exports.define("initialize", function () {
    var sql;
    sql = "INSERT INTO ac_email ("
        + " id, to_addr, status, created_at, to_user, page, session_id, _key "
        + ") VALUES ( "
        + this.id + ", "
        + SQL.Connection.escape(this.to_addr) + ", "
        + "'D', "
        + "NOW(), "
        + SQL.Connection.escape(this.to_user) + ", "
        + (this.page ? SQL.Connection.escape(this.page.id) : "null") + ", "
        + (this.session ? this.session.getSessionId() : "null") + ", "
        + this.id
        + " )";

    SQL.Connection.shared.executeUpdate(sql);

//    this.subject    = this.detokenize(this.subject);
//    this.body       = this.detokenize(this.body);
    this.status = "D";            // draft
    this.status_msg = "Not tried to send";
    this.updateRecord(false);
    if (this.page) {
        this.page.addEmailRow(this);
    }
});
*/

// re-populate properties from fields
module.exports.define("populatePropertiesFromFields", function () {
    var that = this;
    var fields = ["to_addr", "to_user", "subject", "body", "attach_content_type", "attach_data",
        ];

    fields.forEach(function (field) {
        that[field] = that.getField(field).get();
    });
    this.attached_files = JSON.parse(this.getField("attached_files").get() || "[]");
});


module.exports.override("populate", function (resultset) {
    Data.Entity.populate.call(this, resultset);
    this.populatePropertiesFromFields();
});


module.exports.define("updateRecord", function (sent) {
    var sql = "UPDATE ac_email SET subject=?, body=?, status=?, status_msg=?, text_string=?, attach_content_type=?, attach_data=?, attached_files=?";
    var prepared_statement;

    this.debug("updateRecord(): " + this.subject + ", " + this.status + ", " + this.status_msg + ", " + this.text_string);
    if (sent) {
        sql += ", sent_at=now()";
    }
    sql += " WHERE id=?";
    try {
        prepared_statement = SQL.Connection.shared.prepareStatement(sql);
        prepared_statement.setString(1, this.subject);
        prepared_statement.setString(2, this.body);
        prepared_statement.setString(3, this.status);
        prepared_statement.setString(4, this.status_msg);
        prepared_statement.setString(5, this.text_string || null);
        prepared_statement.setString(6, this.attach_content_type || "");
        prepared_statement.setString(7, this.attach_data || "");
        prepared_statement.setString(8, JSON.stringify(this.attached_files));
        prepared_statement.setInt(9, this.id);
        prepared_statement.executeUpdate();
    } catch (e) {
        this.report(e);
    } finally {
        SQL.Connection.shared.finishedWithPreparedStatement(prepared_statement);
    }
});

/*
module.exports.define("makeMultiPartEmail", function () {
    email = new org.apache.commons.mail.MultiPartEmail();
    temp_file = java.io.File.createTempFile( "email_attach_", ".tmp" );
    this.info("Email attachment tempfile: " + temp_file.getAbsoluteFile());
    output_stream = new java.io.FileOutputStream(temp_file);
    oFileManager = new FileManager( oSession, strFileId );
    oFileManager.exportToStream( new java.io.BufferedOutputStream( outputStream ) );
    attachment = new org.apache.commons.mail.EmailAttachment();
    this.debug("Adding attachment file: " + temp_file.getAbsolutePath() );
    attachment.setPath( temp_file.getAbsolutePath() );
    attachment.setDisposition(org.apache.commons.mail.EmailAttachment.ATTACHMENT );
    attachment.setName( oFileManager.getFileName() );
    attachment.setDescription( strFileDescr );
    email.attach( attachment );
    return email;
}
*/

module.exports.define("real_send", function () {
    var email;
    var from_addr;
    var send_addr = this.to_addr;
    var body = this.body;

    this.debug("real_send(): " + this.repudiated + ", " + this.status + ", " + send_addr);
    if (this.repudiated) {
        return false;
    }
    if (this.status === "S") {
        this.throwError({
            id: "email_already_sent",
            email_id: this.getKey(),
        });
    }
    if (Rhino.app.test_send_addr) {
        send_addr = Rhino.app.test_send_addr;
        this.warn("Overriding send address to: " + send_addr + " instead of " + this.to_addr);
    }
    if (!Rhino.app.smtp_mail_server) {
        this.status = "N";
        this.status_msg = "No mail server specified, not sent";
        this.updateRecord(false);
        return false;
    }
    if (this.subject.length >= 255) {
        this.subject = this.subject.substring(0, 255);
        this.status_msg = "Email subject line truncated to internal limit of 255 chars";
    } else if (this.subject.length > 78) {
        this.status_msg = "Email subject line exceeds 78 char recommendation (RFC 2822)";
    }

    from_addr = this.from_addr || Rhino.app.smtp_from_addr;

    this.debug("Sending Email, from:" + from_addr + ", to: " + send_addr + ", subject: " + this.subject);
    this.debug("Sending Email, body:" + body);
    try {
        if (this.use_html_format) {
            email = this.setHTMLMsg();
        } else {
            email = this.setTextMsg();
        }

        email.addTo(send_addr);
        email.setFrom(from_addr);

        // add reply-to address and name if given
        if (this.reply_to) {
            if (this.reply_to_name) {
                email.addReplyTo(this.reply_to, this.reply_to_name);
            } else {
                email.addReplyTo(this.reply_to);
            }
        }

        email.setSubject(IO.JSoup.unescape(this.subject));
        email.setHostName(Rhino.app.smtp_mail_server);

        if (this.use_html_format) {
            this.attached_files.forEach(function (attachment_id) {
                var attachment = Data.entities.get("ac_file").getRow(attachment_id);
                var titleField = attachment.getField("title").get();
                var dataSource = attachment.createFileDataSourceFromContent();
                email.embed(dataSource, titleField);
            });
        }
        email.send();

        this.status_msg = "Winged its way";
        this.status = "S";        // sent
        this.updateRecord(true);
        if (this.session && !this.suppress_email_sent_msg) {
            this.session.messages.add({
                type: "I",
                text: "Email sent to " + this.to_addr,
            });
        }
    } catch (e) {
        this.status_msg = e.toString();
        this.status = "F";
        this.updateRecord(false);
        this.report(e);
    }
    return (this.status === "S");
});

/**
 * Here we set the already detokenized body and we prepare the alt body
 * by de-tagging the html version of the body
 * @return {Packages.org.apache.commons.mail} email object to send
 */
module.exports.define("setHTMLMsg", function () {
    var email = new Packages.org.apache.commons.mail.HtmlEmail();
    email.setCharset("UTF-8");
    if (!this.use_base64_cids) {
        this.embedCidData(email);
    }
    email.setHtmlMsg(this.body);
    email.setTextMsg(IO.JSoup.removeTags(this.body));
    if (this.attach_content_type && this.attach_data) {
        email.addPart(this.attach_data, this.attach_content_type);
    }
    return email;
});

module.exports.define("setTextMsg", function () {
    var email = new Packages.org.apache.commons.mail.SimpleEmail();
    email.setCharset("UTF-8");
    email.setMsg(IO.JSoup.removeTags(this.body));
    if (this.attach_content_type && this.attach_data) {
        this.error("Non html email doesn't support attachments");
    }
    return email;
});

module.exports.define("send", function () {
    this.real_send();
    if (this.delegates_email_rows) {
        this.delegates_email_rows.forEach(function (email_row) {
            email_row.real_send();
        });
    }
});

module.exports.define("replaceToken_file", function (tokens) {
    var file_id = tokens[1];
    var file_row;
    var return_value = "";
    try {
        file_row = Data.entities.get("ac_file").getRow(file_id);
        this.attached_files.push(file_id);
        return_value = "Attachment " + this.attached_files.length + ": " + file_row.getField("title").get();
    } catch (e) {
        this.error(e);
        return_value = "Unknown file (" + file_id + ")";
    }
    return return_value;
});

module.exports.define("replaceToken_href", function (tokens) {
    var href;
    if (this.use_html_format) {
        href = "<a href='" + Rhino.app.base_uri + this[tokens[1]] + "'>" + (tokens[2] || "Link") + "</a>";
    } else {
        href = Rhino.app.base_uri + this[tokens[1]];
    }
    return href;
});


module.exports.define("replaceToken_hrefFull", function (tokens) {
    var href;
    if (this.use_html_format) {
        href = "<a href='" + this[tokens[1]] + "'>" + (tokens[2] || "Link") + "</a>";
    } else {
        href = this[tokens[1]];
    }
    return href;
});


module.exports.override("archive", function (path, non_destructive, max_trans, max_session) {
    var rows;
    var filename = this.id + ".sql";
    var condition = "session_id <= " + max_session;

    Rhino.app.dumpMySQLDataThrowOnFail(path + filename, {
        tables: "ac_email",
        where_clause: condition,
    });
    if (!non_destructive) {
        rows = SQL.Connection.shared.executeUpdate("DELETE FROM ac_email WHERE " + condition);
    }
    this.info("Archived " + rows + " rows from " + this.table);
    return filename;
});
