"use strict";

var UI = require("lazuli-ui/index.js");
var IO = require("lazuli-io/index.js");


module.exports = UI.Page.clone({
    id              : "sy_load_ulf",
    title           : "Load ULF",
    security        : { sysmgr: true },
    browser_timeout : 60 * 60 * 1000            // 1 hour in ms
});


module.exports.sections.addAll([
    { id: "params", type: "FormParams", title: "Filters", columns: 1, layout: "multi-column" },
]);


module.exports.buttons.addAll([
    { id: "exec", label: "Execute" },
]);


module.exports.defbind("setupEnd", "setupEnd", function () {
    var fieldset = this.sections.get("params").fieldset;
    fieldset.addFields([
        { id: "file", type: "File", label: "ULF File", /* css_reload: true, File fields don't do this at the moment */
            allowed_extensions: "csv" },
        { id: "override_validations", type: "Boolean", label: "Override Validations?" },
    ]);
    this.ulf = IO.FileProcessorULF.clone({
        id: "ulf",
    });
});


module.exports.defbind("updateAfterSections", "updateAfterSections", function (params) {
    var fieldset = this.sections.get("params").fieldset;
    var file_field = fieldset.getField("file");
    this.ulf.override_all_validations = (fieldset.getField("override_validations").get() === "Y");
    if (params.page_button === "exec") {
        if (!file_field.isBlank()) {
            this.runULF(file_field.get());
        }
    }
});


module.exports.define("runULF", function (file_id) {
    try {
        this.ulf.file_id = file_id;
        this.ulf.process(this.session);
    } catch (e) {
        this.session.messages.report(e);
        this.report(e);
    }
    this.session.messages.add({ type: "I", text: "Pages saved successfully: " + this.ulf.counters.page_saved });
    if (this.ulf.counters.page_error) {
        this.session.messages.add({ type: "E", text: "Pages not saved: " + this.ulf.counters.page_error });
    }
    if (this.ulf.counters.page_fail) {
        this.session.messages.add({ type: "E", text: "Pages failed: " + this.ulf.counters.page_fail });
    }
    this.redirect_url = UI.pages.get("ac_session_display").getSimpleURL(this.session.id);
});
