"use strict";

var Data = require("lazuli-data/index.js");
var Rhino = require("lazuli-rhino/index.js");
var Access = require("lazuli-access/index.js");


/** dummy email tokens */
module.exports = Data.entities.get("ac_email");

module.exports.dummy_tokens = {
        product_name: "myRecruiter",
        base_uri    : Rhino.app.base_uri,
        unlock_url  : "index.html#page_id=ac_user_unlock&&user_id=&unlock_code=",
        url         : "index.html#page_id=vr_rqmt_display&page_key=2",
        to_user     : "kurolaj",
        email_footer: "Kind regards",
        nice_name   : "Test",
        to_addr     : "old@email.com",
        new_email_addr: "new@email.com",
        text_detail: "Text details",
        email_header: "Dear User ",
        wf_step_title: "Workflow step",
        wf_title    : "Task to do",
        wf_simple_url: "page_key=vr_rqmt_approve&page_id=2",
        wf_due_date : "05/02/15",
        client_name : Rhino.app.client.organization_name,
        rsrc_name   : "Candidate, Test",
        asgn_end_dt : "05/03/15",
        name        : "Test",
        sbm_id      : "1",
        user        : "sms user",
        pwd         : "sms pwd",
        number      : "072343234",
        first_name  : "Test",
        job_title   : "Test Job",
        last_name   : "Candidate",
        rqmt        : "Test Job",
        key         : "2",
        hiring_mgr  : "Client Hirer",
        ivw_date_time: "01/03/15",
        exp_duration: "30 mins",
        cand_info   : "Extra info for candidate",
        locn        : "London",
        locn_addl   : "Oxford Street",
        hiring_mgr_name_nice : "Client Hirer",
        hiring_mgr_email: "hiring@manager.com",
        full_name   : "Candidate, Test",
        date        : "01/03/15",
        full_name_nice: "Test Candidate",
        job_id      : "2",
        job_name    : "Test Job",
        rqmt_name   : "Test Job",
        cand_name   : "Candidate Test",
        offer_id    : "2.1",
        interview   : "03/03/15",
        rqmt_id     : "2",
        sender      : "Test Sender",
        splr        : "Monster",
        link        : Rhino.app.base_uri + "/extranet.html"
};
/** end dummy tokens */


module.exports.define("testExistingEmail", function (email_id, addr, html, footer) {
    var s = Access.Session.getNewSession({
        user_id:"batch",
    });
    var options;
    var email_row;

    try {
        Rhino.app.smtp_mail_server = "10.12.1.16";
        Rhino.app.smtp_from_addr   = "rsl.support@rullion.co.uk";

        email_row = Data.entities.get("ac_email").getRow(email_id);
        options = {};
        options.body = email_row.getField("body").get();
        options.subject = email_row.getField("subject").get();
        options.session = s;
        options.to_addr = addr || "joel.kurola@rullion.co.uk";
        options.suppress_footer_ident = footer;
        options.use_html_format = html;
        options.attached_files = JSON.parse(email_row.getField("attached_files").get() || "[]");
        Data.entities.get("ac_email").create(options).send();
    } catch (e) {
        this.report(e);
    } finally {
        delete Rhino.app.smtp_mail_server;
        delete Rhino.app.smtp_from_addr;
        s.close();
    }
});


module.exports.define("testEmail", function (addr) {
    var s = Access.Session.getNewSession({
        user_id:"batch",
    });
    var options;
    try {
        Rhino.app.smtp_mail_server = "10.12.1.16";
        Rhino.app.smtp_from_addr   = "rsl.support@rullion.co.uk";
        Data.Area.areas.each(function (area) {
            if (area.text_strings) {
                Object.keys(area.text_strings).forEach(function (key) {
                    var text_string = area.text_string[key];
                    if (text_string.type === "N") {
                        options = Data.entities.get("ac_email").dummy_tokens;
                        options.to_addr = addr || "joel.kurola@rullion.co.uk";
                        options.to_user = "kurolaj";
                        options.session = s;
                        options.text_string = area.id + "." + key;
                        Data.entities.get("ac_email").create(options).send();
                    }
                });
            }
        });
    } catch (e) {
        this.report(e);
    } finally {
        delete Rhino.app.smtp_mail_server;
        delete Rhino.app.smtp_from_addr;
        s.close();
    }
});
