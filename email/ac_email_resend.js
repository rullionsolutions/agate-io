"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.Page.clone({
    id: "ac_email_resend",
    entity_id: "ac_email",
    title: "Re-send this Email",
    requires_key: true,
    transactional: true,
    allow_no_modifications: true,
});


module.exports.sections.addAll([
    {
        id: "params",
        type: "FormParams",
        text: "You can enter a new e-mail address otherwise the one below will be used.",
    },
    {
        id: "main",
        type: "Display",
        entity: "ac_email",
    },
    {
        id: "body",
        type: "DisplayEmailBody",
    },
]);


module.exports.defbind("setAddress", "setupEnd", function () {
    var fieldset = this.sections.get("params").fieldset;
    var user_row;
    var default_addr = "";

    fieldset.addFields([
        { id: "to_addr", type: "Email", label: "To Address",  mandatory: true }
    ]);

    if (!this.getPrimaryRow().getField("to_user").isBlank()) {
        // Use the user's address
        user_row = this.getPrimaryRow().getField("to_user").getRow(false);
        default_addr = user_row.getField("email").get();
    }
    // Use the address from the original e-mail
    if (!default_addr) {
        default_addr = this.getPrimaryRow().getField("to_addr").get();
    }
    fieldset.getField("to_addr").set(default_addr);

    this.sections.get("body").record = this.getPrimaryRow();
});


module.exports.defbind("updateAfterSections", "updateAfterSections", function (params) {
    var curr_email;
    var new_email;

    if (params.page_button === "save") {
        curr_email = this.getPrimaryRow();
        new_email = Data.entities.get("ac_email").cloneAutoIncrement(
            curr_email.copyBaseSpec(), {
        });
        new_email.to_addr = this.sections.get("params").fieldset.getField("to_addr").get();
        new_email.id = new_email.getKey();
        new_email.send();
    }
});
