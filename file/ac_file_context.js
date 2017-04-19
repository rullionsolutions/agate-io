"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ContextPage.clone({
    id              : "ac_file_context",
    entity_id       : "ac_file",
    title           : "File",
    requires_key    : true,
    security        : { all: true }
});


module.exports.sections.addAll([
    { id: "display", type: "Display", entity: "ac_file" }
]);


module.exports.links.addAll([
    { id: "delete", page_to: "ac_file_delete", page_key: "{page_key}" }
]);


module.exports.defbind("setupEnd", "setupEnd", function () {
    if (!this.session.allowed_files || !this.session.allowed_files[this.page_key]) {
        this.active = false;
        this.sections.get("display").visible = false;
    } else {
        this.sections.get("display").fieldset.getField("id"          ).visible = false;
        this.sections.get("display").fieldset.getField("title"       ).visible = false;
        this.sections.get("display").fieldset.getField("content_type").visible = false;
        this.sections.get("display").fieldset.getField("session_id"  ).visible = false;
    }
});
