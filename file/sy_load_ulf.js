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
        { id: "override_validtions", type: "Boolean", label: "Override Validations?" },
    ]);
    this.ulf = IO.FileProcessorULF.clone({
        id: "ulf",
    });
});


module.exports.defbind("updateAfterSections", "updateAfterSections", function (params) {
    var fieldset = this.sections.get("params").fieldset;
    var file_field = fieldset.getField("file");
    this.ulf.override_all_validations = (fieldset.getField("override_validtions").get() === "Y");
    if (params.page_button === "exec") {
        if (!file_field.isBlank()) {
            this.runULF(file_field.get());
        }
    }
});


module.exports.define("runULF", function (file_id) {
    var ulf_out;
    try {
        this.ulf.file_id = file_id;
        ulf_out = this.ulf.process(this.session);
    } catch (e) {
        this.session.messages.report(e);
        this.report(e);
    }
    if (ulf_out) {
        this.session.messages.add({ type: "I", text: "Pages saved successfully: " + ulf_out.page_saved });
        if (ulf_out.error) {
            this.session.messages.add({ type: "E", text: ulf_out.error });
        }
        if (ulf_out.page_error) {
            this.session.messages.add({ type: "E", text: "Pages not saved: " + ulf_out.page_error });
        }
        if (ulf_out.page_fail) {
            this.session.messages.add({ type: "E", text: "Pages failed: " + ulf_out.page_fail });
        }
        if (ulf_out.first_session) {
            this.redirect_url = UI.pages.get("ac_session_display").getSimpleURL(ulf_out.first_session.id);
        }
    }
//            this.cancel();
});
