"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id              : "ac_file_upload",
    title           : "Upload a File",
    entity_id       : "ac_file",
});


module.exports.sections.addAll([
    { id: "params", type: "FormParams", title: "Choose a file to upload" }
]);


module.exports.defbind("setupParams", "setupEnd", function () {
    this.sections.get("params").fieldset.addFields([
        { id: "upload_file", type: "File", label: "Upload File", editable: true },
    ]);
});
