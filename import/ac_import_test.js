"use strict";

var Data = require("lazuli-data/index.js");


module.exports = Data.entities.get("ac_import");

module.exports.subtypes.test = module.exports.clone({
    id              : "test"
});


module.exports.subtypes.test.override("exec", function (request, response) {
    this.rpns_body   = "Hello test";
    this.rpns_status = "200";
    // to be inherited
});
