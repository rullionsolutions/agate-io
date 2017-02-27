"use strict";


var UI = require("lazuli-ui/index.js");

module.exports = UI.Page.clone({
    id              : "ac_import_search",
    entity_id       : "ac_import",
    title           : "Search for Inbound Exchanges",
    short_title     : "Inbound Exchanges"
});


module.exports.sections.addAll([
    { id: "main", type: "Search", entity: "ac_import" }
]);
