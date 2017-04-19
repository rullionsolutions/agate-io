"use strict";

var UI = require("lazuli-ui/index.js");


module.exports = UI.Page.clone({
    id              : "ac_file_delete",
    entity_id       : "ac_file",
    title           : "Delete this File",
    transactional   : true,
    requires_key    : true,
    short_title     : "Delete",
    security        : { all: false, sysmgr: true }
});


module.exports.sections.addAll([
    { id: "main", type: "Delete", entity: "ac_file" }
]);
