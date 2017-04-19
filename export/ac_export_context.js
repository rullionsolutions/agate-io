"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ContextPage.clone({
    id              : "ac_export_context",
    entity_id       : "ac_export",
    title           : "Outbound Exchange",
    requires_key    : true
});


module.exports.sections.addAll([
    { id: "main", type: "Display", entity: "ac_export" }
]);
