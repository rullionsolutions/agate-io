"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.Page.clone({
    id              : "ac_email_create",
    title           : "Send an Email",
    security        : { sysmgr: true }
});


module.exports.sections.addAll([
    { id: "params", type: "FormParams", title: "Details of Email to Send" }
]);


module.exports.buttons.add({ id: "send", label: "Send", css_class: "btn-primary" });


module.exports.defbind("setupEnd", "setupEnd", function () {
    var fieldset = this.sections.get("params").fieldset;
    fieldset.addFields([
        { id: "to_user", label: "Recipient User", type: "Reference" , css_reload: true, ref_entity: "ac_user" },
        { id: "to_addr", label: "To Address"    , type: "Email"     , css_reload: true },
        { id: "subject", label: "Subject"       , type: "Text"      , data_length: 255 },
        { id: "body"   , label: "Body Text"     , type: "Textarea"  }
    ]);
});


module.exports.defbind("updateAfterSections", "updateAfterSections", function (params) {
    var fieldset = this.sections.get("params").fieldset,
        spec     = { session: this.session };

    if (!fieldset.getField("to_user").isBlank()) {
        fieldset.getField("to_addr").visible = false;
        fieldset.getField("to_addr").set("");
    } else {
        fieldset.getField("to_addr").visible = true;
    }
    if (!fieldset.getField("to_addr").isBlank()) {
        fieldset.getField("to_user").visible = false;
        fieldset.getField("to_user").set("");
    } else {
        fieldset.getField("to_user").visible = true;
    }
    fieldset.getField("to_addr").validate();
    fieldset.getField("to_user").validate();

    if (params.page_button === "send") {
        fieldset.addValuesToObject(spec);
        this.send(spec);
        this.redirect_url = "index.html?page_id=ac_email_display&page_key=" + spec.id;
        this.active = false;
    }
});


module.exports.define("send", function (spec) {
     var email_row = Data.entities.get("ac_email").create(spec);
     email_row.send();
     return email_row.getKey();
});
