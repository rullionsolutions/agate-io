"use strict";


var UI = require("lazuli-ui/index.js");

module.exports = UI.Page.clone({
    id               : "ac_file_search",
    entity_id       : "ac_file",
    title            : "Search for Files",
    short_title      : "Files"
});


module.exports.sections.addAll([
    { id: "search", type: "Search", entity: "ac_file" }
]);


module.exports.links.addAll([
    { id: "upload", page_to: "ac_file_upload" }
]);
