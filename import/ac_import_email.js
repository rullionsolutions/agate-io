"use strict";

var Data = require("lazuli-data/index.js");
var SQL = require("lazuli-sql/index.js");


module.exports = Data.entities.get("ac_import");

module.exports.subtypes.email = module.exports.clone({
    id              : "email"
});


module.exports.subtypes.email.override("exec", function (request, response) {
    var email,
        user_id;

    this.rpns_status = "400";
    if (this.rqst_params.email_id && !isNaN(parseInt(this.rqst_params.email_id, 10))) {
        try {
            email = Data.entities.get("ac_email").getRow(this.rqst_params.email_id);
            user_id = email.getField("to_user").get();
            if (user_id) {
                SQL.Connection.shared.executeUpdate("UPDATE ac_user SET email_verification = 'R' WHERE id = " + SQL.Connection.escape(user_id));
                this.rpns_body = "Email repudiated";
                this.rpns_status = "200";
            } else {
                this.error(this, "No user_id");
                this.rpns_body = "No user record";
            }
        } catch (e) {
            this.error(this, e.toString());
            this.rpns_body   = "Error while executing request";
        }
    } else {
        this.rpns_body   = "Bad request params";
    }
});
