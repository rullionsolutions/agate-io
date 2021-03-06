"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id: "ac_email_display",
    entity_id: "ac_email",
    title: "Email",
    requires_key: true,
});


module.exports.sections.addAll([
    {
        id: "main",
        type: "Display",
        entity_id: "ac_email",
    },
    {
        id: "body",
        type: "DisplayEmailBody",
    },
]);


module.exports.links.addAll([
    {
        id: "resend",
        page_to: "ac_email_resend",
        page_key: "{page_key}",
    },
]);


module.exports.defbind("setDisplayBodyRecord", "setupEnd", function () {
    this.sections.get("body").record = this.getPrimaryRow();
});
