"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.ContextPage.clone({
    id              : "ac_email_context",
    entity_id       : "ac_email",
    title           : "Email",
    requires_key    : true
});


module.exports.sections.addAll([
    { id: "main", type: "Display", entity: "ac_email" }
]);
