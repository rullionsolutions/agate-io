"use strict";

var SQL = require("lazuli-sql/index.js");
var IO = require("lazuli-io/index.js");
var Rhino = require("lazuli-rhino/index.js");


Rhino.App.defbind("io_loadData", "build", function () {
    SQL.Connection.shared.loadSQLFile(IO.File.getModulePath(module) + "/email/build.sql");
    // SQL.Connection.loadSQLFile(IO.File.getModulePath(module) + "/export/build.sql");
    // SQL.Connection.loadSQLFile(IO.File.getModulePath(module) + "/file/build.sql");
    // SQL.Connection.loadSQLFile(IO.File.getModulePath(module) + "/import/build.sql");
});
