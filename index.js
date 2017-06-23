"use strict";
var UI = require("lazuli-ui/index.js");


require("agate-io/aug-lapis-core/Format.js");
require("agate-io/aug-lazuli-io/HttpServer.js");

require("agate-io/config.js");

UI.sections.add(UI.DisplayEmailBody = require("agate-io/email/DisplayEmailBody.js"));
require("agate-io/email/ac_email.js");
require("agate-io/email/ac_email_context.js");
require("agate-io/email/ac_email_create.js");
require("agate-io/email/ac_email_cal_create.js");        // uses cal_create
require("agate-io/email/ac_email_display.js");
require("agate-io/email/ac_email_resend.js");
require("agate-io/email/ac_email_search.js");
require("agate-io/email/ac_email_test.js");

require("agate-io/export/ac_export.js");
require("agate-io/export/ac_export_ftp.js");
require("agate-io/export/ac_export_context.js");
require("agate-io/export/ac_export_display.js");
require("agate-io/export/ac_export_search.js");
require("agate-io/export/ac_export_event.js");

require("agate-io/file/ac_file.js");
require("agate-io/file/ac_file_context.js");
require("agate-io/file/ac_file_delete.js");
require("agate-io/file/ac_file_display.js");
require("agate-io/file/ac_file_search.js");
require("agate-io/file/ac_file_upload.js");
require("agate-io/file/sy_load_ulf.js");

require("agate-io/import/ac_import.js");
require("agate-io/import/ac_import_context.js");
require("agate-io/import/ac_import_display.js");
require("agate-io/import/ac_import_search.js");
require("agate-io/import/ac_import_email.js");
require("agate-io/import/ac_import_test.js");

