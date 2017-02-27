"use strict";


var UI = require("lazuli-ui/index.js");

module.exports = UI.Page.clone({
    id              : "ac_file_display",
    entity_id       : "ac_file",
    title           : "File",
    requires_key    : true,
});


module.exports.sections.addAll([
    { id: "display", type: "Display", entity: "ac_file" }
]);


// UI.pages.get(ac_file_display).links.addAll([
//      { id: "preview", url : "{page_key}" },
//    { id: "open"   , url: "file/{title}?mode=filedown&id={page_key}", label: "Open" },
//    { id: "update" , page_to: "ac_file_update", page_key: "{page_key}" },
//    { id: "delete" , page_to: "ac_file_delete", page_key: "{page_key}" }
// ]);
