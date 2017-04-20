"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ContextPage.clone({
    id              : "ac_import_context",
    entity_id       : "ac_import",
    title           : "Inbound Exchange",
    requires_key    : true
});


module.exports.sections.addAll([
    { id: "main", type: "Display", entity: "ac_import" }
]);
