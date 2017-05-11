"use strict";

var Core = require("lapis-core/index.js");
var Rhino = require("lazuli-rhino/index.js");
var UI = require("lazuli-ui/index.js");
var Data = require("lazuli-data/index.js");

Core.Format.define("getVCalString", function (options) {
    var str = "BEGIN:VCALENDAR\nVERSION:2.0\n";
    var i;
    var that = this;

    if (!options.event_title) {
        throw x.Exception.clone({ id: "missing_properties", text: "getVCalString() requires event_title" });
    }
    if (!options.event_start || (!Date.parseString(options.event_start) && !Date.parseString(options.event_start, "yyyy-MM-dd HH:mm:ss"))) {
        throw x.Exception.clone({ id: "missing_properties", text: "getVCalString() requires event_start" });
    }
    if (!options.event_end && !options.duration) {
        throw x.Exception.clone({ id: "missing_properties", text: "getVCalString() requires event_end or duration" });
    }

// ----------------------------------------------------- Method
    options.upd_sequence = options.upd_sequence || "1";
    if (!options.event_method) {
        if (options.upd_sequence === "1") {
            options.event_method = "PUBLISH";
        } else {
            options.event_method = "REQUEST";
        }
    }
    str += "METHOD:" + options.event_method + "\n\PRODID:www.rullionsolutions.com\n\BEGIN:VEVENT\n";

// ----------------------------------------------------- UID
    if (!options.base_uri) {
        options.base_uri = Rhino.App.base_uri;
    }
    if (!options.event_url && options.target_page) {
        options.event_url = options.base_uri + UI.pages[options.target_page].getSimpleURL(options.target_key);
    }
    if (!options.event_uid) {
        if (options.event_url) {
            options.event_uid = options.event_url;
        } else {
            options.event_uid = Rhino.app.app_id + "/" + options.id;
        }
    }
    str += "UID:" + options.event_uid + "\n";

// ----------------------------------------------------- Update Sequence
    str += "SEQUENCE:" + options.upd_sequence + "\n";

// ----------------------------------------------------- Datestamp
    str += "DTSTAMP:" + (new Date()).format("yyyyMMddTHHmmss") + "\n";

// ----------------------------------------------------- Start and End
    function convertDateTime(date_time_str) {
        if (date_time_str.length === 15) {
            return date_time_str;
        } else if (date_time_str.length === 10) {
            return Date.parseString(date_time_str, "yyyy-MM-dd").format("yyyyMMdd") + "T000000";
        }
        return Date.parseString(date_time_str, "yyyy-MM-dd HH:mm:ss").format("yyyyMMddTHHmmss");
    }
    if (!options.event_end) {
        options.event_end = Date.parseString(options.event_start, "yyyy-MM-dd HH:mm:ss").add("m", options.duration).format("yyyy-MM-dd HH:mm:ss");
    }
    str += "DTSTART:" + convertDateTime(options.event_start) + "\nDTEND:" + convertDateTime(options.event_end) + "\n";

// ----------------------------------------------------- Event Summary
    options.event_summary = options.event_summary || options.event_title;
    str += "SUMMARY:" + options.event_summary + "\n";

// ----------------------------------------------------- Cancelled
    if (options.event_method === "CANCEL") {
        str += "STATUS:CANCELLED\n";
    }

    function addAttendeeByEmail(email, name, is_chair) {
        if (is_chair) {
            str += "ORGANIZER;ROLE=CHAIR;";
        } else {
            str += "ATTENDEE;ROLE=REQ-PARTICIPANT;";
        }
        if (name) {
            str += "CN=" + name.replace(/,;/g, "") + ";";
        }
        str += "RSVP=TRUE:MAILTO:" + email + "\n";
    }

    function addAttendeeByUser(user_id, is_chair) {
        var user_row;
        try {
            user_row = Data.entities.ac_user.getRow(user_id);
            addAttendeeByEmail(user_row.getField("email").get(),
                that.convertNameFirstSpaceLast(user_row.getField("name").get()), is_chair);
        } catch (e) {
            that.report(e);
        }
    }

    function addAttendeeByUserOrEmail(user_id_or_email, is_chair) {
        if (user_id_or_email.indexOf("@") > -1) {
            addAttendeeByEmail(user_id_or_email, is_chair);
        } else {
            addAttendeeByUser(user_id_or_email, is_chair);
        }
    }

    //----------------------------------------------------- Organizer
    if (options.organiser_user) {
        addAttendeeByUser(options.organiser_user, true);
    }
    //----------------------------------------------------- Attendees
    for (i = 0; i < options.attendees_array && options.attendees_array.length; i += 1) {
        addAttendeeByUserOrEmail(options.attendees_array[i], false);
    }
    //----------------------------------------------------- Description
    if (!options.event_description && options.event_url) {
        options.event_description = "See " + options.event_url;
    }
    if (options.event_description) {
        str += "DESCRIPTION:" + options.event_description + "\n";
    }

    //----------------------------------------------------- Location
    if (options.event_locn) {
        str += "LOCATION:" + options.event_locn + "\n";
    }

    //----------------------------------------------------- End
    str += "END:VEVENT\nEND:VCALENDAR";
    return str;
});
