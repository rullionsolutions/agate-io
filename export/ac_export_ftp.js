/* global Packages */

"use strict";

var Data = require("lazuli-data/index.js");
var Rhino = require("lazuli-rhino/index.js");


module.exports = Data.entities.get("ac_export");

module.exports.subtypes.ftp = module.exports.clone({
    id: "ftp",
    server: Rhino.app.ftp_server,
    user: Rhino.app.ftp_user,
    pswd: Rhino.app.ftp_pswd,
    files: [],
    response: {
        msg: "",
    },
    payload: "",
});


module.exports.subtypes.ftp.define("addFile", function (content, file_name) {
    var temp_file;
    var bw;
    var prefix = file_name.split(".")[0];
    var suffix = "." + file_name.split(".")[1];

    temp_file = Packages.java.io.File.createTempFile(prefix, suffix);
    try {
        bw = new Packages.java.io.BufferedWriter(
            new Packages.java.io.OutputStreamWriter(
            new Packages.java.io.FileOutputStream(temp_file), "UTF-8"));
        bw.write(content);
        bw.close();
        bw = false;
        this.payload += content + "\n";
    } catch (e) {
        this.error("Error while writing to a temp file\n" + e);
        this.response.body = e;
    } finally {
        if (bw) {
            bw.close();
        }
    }

    this.files.push({
        file: temp_file,
        name: file_name,
    });
});


module.exports.subtypes.ftp.define("connect", function () {
    var success = true;
    var reply_code;

    this.ftps_client = new Packages.org.apache.commons.net.ftp.FTPSClient();
    this.ftp_reply = Packages.org.apache.commons.net.ftp.FTPReply;

    this.ftps_client.connect(this.server);

    reply_code = this.ftps_client.getReplyCode();

    if (!this.ftp_reply.isPositiveCompletion(reply_code)) {
        success = false;
        this.session.messsages.add({
            type: "W",
            text: "Couldn't connect to FTP server",
        });
        this.response.body = "FTP connection failed with reply code " + reply_code + " and response " + this.ftps_client.getReplyString();
        this.error(this.response.body);
    } else {
        this.connected = true;
    }

    return success;
});


module.exports.subtypes.ftp.define("login", function (user, passwd) {
    var success = this.ftps_client.login(user, passwd);
    var reply_code = this.ftps_client.getReplyCode();

    if (success) {
        this.ftps_client.execPBSZ(0);
        this.ftps_client.execPROT("P");
        this.ftps_client.enterLocalPassiveMode();
    } else {
        this.session.messsages.add({
            type: "W",
            text: "Couldn't login to FTP server",
        });
        this.response.body = "FTP login failed with reply code " + reply_code + " and response " + this.ftps_client.getReplyString();
        this.error(this.response.body);
    }

    return success;
});


module.exports.subtypes.ftp.define("uploadFiles", function () {
    var success = false;
    var input;

    try {
        this.files.forEach(function (file_obj) {
            input = new Packages.java.io.FileInputStream(new Packages.java.io.File(file_obj.file));
            this.ftps_client.storeFile(file_obj.name, input);
            success = this.ftp_reply.isPositiveCompletion(this.ftps_client.getReplyCode());
            this.response.body += "FTP upload completed with reply code " + this.ftps_client.getReplyCode() + " and response " + this.ftps_client.getReplyString() + "\n";
        });
        this.response.msg = "OK";
    } catch (e) {
        this.response.body = e;
        this.error(e);
        success = false;
    } finally {
        if (input) {
            input.close();
        }
    }
    return success;
});

module.exports.subtypes.ftp.define("connectAndLogin", function () {
    this.connect(this.server);
    return this.login(this.user, this.pswd);
});


module.exports.subtypes.ftp.define("checkExecSettings", function () {
    var success = true;
    if (this.invalid_server_settings) {
        this.session.messages.add({
            type: "W",
            text: "Incomplete FTP settings",
        });
        this.response.body = "Incomplete FTP settings";
        success = false;
    } else if (this.files.length === 0) {
        this.session.messages.add({
            type: "W",
            text: "No files for FTP upload",
        });
        this.response.body = "No files for FTP upload";
        success = false;
    }
    return success;
});


module.exports.subtypes.ftp.override("exec", function () {
    var success = false;
    if (!this.checkExecSettings()) {
        return success;
    }
    if (this.connectAndLogin()) {
        success = this.uploadFiles();
    }
    return success;
});


module.exports.subtypes.ftp.define("upload", function () {
    var success;
    this.dbUpdateBeforeExport();
    success = this.exec();
    this.dbUpdateAfterExport(this.response);
    return success;
});


module.exports.subtypes.ftp.define("disconnect", function () {
    if (this.logged_in) {
        this.ftps_client.logout();
    }
    if (this.connected) {
        this.ftps_client.disconnect();
    }
});


module.exports.subtypes.ftp.override("checkMinimumRequirement", function (object) {
    var options = object || this;
    if (!options.server || !options.user || !options.pswd) {
        this.error("ftp minimum requirement are server, user and password");
        this.invalid_server_settings = true;
    }
});


module.exports.subtypes.ftp.override("create", function (opts) {
    var export_row;
    var options = opts;
    options.id = String(Data.entities.get("ac_max_key").generate("ac_export", null, null, "id", null, options.session));
    options.modifiable = true;
    options.instance = true;
    export_row = this.clone(options);
    export_row.checkMinimumRequirement();
    return export_row;
});
