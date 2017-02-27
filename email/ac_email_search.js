"use strict";


var UI = require("lazuli-ui/index.js");

module.exports = UI.Page.clone({
    id               : "ac_email_search",
    entity_id       : "ac_email",
    title            : "Search for Emails",
    short_title      : "Emails"
});


module.exports.sections.addAll([
    { id: "main", type: "Search", entity: "ac_email" }
]);


module.exports.links.addAll([
    { id: "cre_email", page_to: "ac_email_create" },
    { id: "cre_cal"  , page_to: "ac_email_cal_create" }
]);


module.exports.defbind("setupEnd", "setupEnd", function () {
    var mail_sec = this.sections.get("main");
    mail_sec.columns.get("created_at").visible = true;
    mail_sec.columns.moveTo("created_at", 2);
    mail_sec.columns.moveTo("session_id", 7);
});
