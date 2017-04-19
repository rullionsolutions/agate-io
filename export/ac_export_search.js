"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.SearchPage.clone({
    id              : "ac_export_search",
    entity_id       : "ac_export",
    title           : "Search for Outbound Exchanges",
    short_title     : "Outbound Exchanges"
});


module.exports.sections.addAll([
    { id: "main", type: "Search", entity: "ac_export", show_row_control: false }
]);
