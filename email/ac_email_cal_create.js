"use strict";

var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");


module.exports = UI.pages.get("ac_email_create").clone({
    id              : "ac_email_cal_create",
    title           : "Send a Calendar Email"
});


module.exports.defbind("addAddlFields", "setupEnd", function () {
    var fieldset = this.sections.get("params").fieldset;
    fieldset.addFields([
        { id: "event_title", label: "Event Title"          , type: "Text" , data_length: 80 },
        { id: "event_start", label: "Event Start Date/time", type: "DateTime" },
        { id: "event_end"  , label: "Event End Date/time"  , type: "DateTime" }
    ]);
    fieldset.getField("subject").visible = false;
    fieldset.getField("body"   ).visible = false;
});


module.exports.override("send", function (spec) {
    var email_row = Data.entities.get("ac_email").createEvent(spec);
    email_row.send();
    return email_row.getKey();
});
