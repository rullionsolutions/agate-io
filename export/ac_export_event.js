"use strict";

var Data = require("lazuli-data/index.js");
var Rhino = require("lazuli-rhino/index.js");


module.exports = Data.entities.get("ac_export");

module.exports.subtypes.event = module.exports.clone({
    id              : "event",
    google_cal_url  : "https://www.googleapis.com/calendar/v3/calendars/"
});


module.exports.subtypes.event.override("create", function (options) {
    var method,
        url;

    if (!options.event_id || !options.calendar_id || !options.action || !options.title || !options.start) {
        this.throwError({ id: "missing_properties", text: "requires event_id, calendar_id, action, title, start", options: options });
    }
    if (!options.end && !options.duration) {
        this.throwError({ id: "missing_properties", text: "requires end or duration" });
    }
    if (!options.end) {
        options.end = Date.parseString(options.start, "yyyy-MM-ddTHH:mm:ss").add("m", options.duration).format("yyyy-MM-ddTHH:mm:ss");
    }
    options.id       = options.event_id;
    delete options.event_id;
    options.start    = { dateTime: options.start };
    options.end      = { dateTime: options.end   };
    options.kind     = "calendar#event";
    options.sequence = options.sequence || 1;
    options.status   = options.status   || "confirmed";
    if (options.action === 'C') {
        method = "POST";
        url    = this.google_cal_url + options.calendar_id + "/events/";
    } else {
        method = "PUT";
        url    = this.google_cal_url + options.calendar_id + "/events/" + options.event_id;
        if (options.action === 'D') {
            options.status = "cancelled";
        } else if (options.action !== 'U') {
            this.throwError({ id: "invalid_property", text: "action must be 'C', 'U', or 'D'" });
        }
    }

    return this.parentcreate({
        url: url, method: method, payload: JSON.stringify(options),
        request_headers: {
            "If-None-Match": "*",
            Host: Rhino.app.calendar_host,
            "Content-Type": "text/calendar",
            Authorization: "Basic " + Rhino.app.calendar_auth_basic_base64
        }
    });
});


/*
//auth scope: https://www.googleapis.com/auth/calendar

1. Requesting the token...
https://accounts.google.com/o/oauth2/auth?scope=https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fcalendar&state=Lucidium&access_type=offline&redirect_uri=https%3A%2F%2Fssl.rullionsolutions.com%2Fcato%2Fjsp%2Fmain.jsp%3Fguest_id=guest%26mode=post%26page_id=guest_home&response_type=code&client_id=846812482710.apps.googleusercontent.com
Browsing this allowed me (presumably already authenticated as my Google a/c to grant permission for myRecruiter to access my calendars (mine or the RSL Team one, or both?)
On doing so, Google sent a request to the redirect_uri (Cato guest page), which contained the following parameter: code=4/SvLfUDY7UW7NK40kgD0010E2QVHC.Eo4nt8pG-joSYFZr95uygvWDti12jgI

2. Request the access/refresh tokens...
POST https://accounts.google.com/o/oauth2/token
http headers:
 Host: accounts.google.com
 Content-Type: application/x-www-form-urlencoded
payload:
 code=4/SvLfUDY7UW7NK40kgD0010E2QVHC.Eo4nt8pG-joSYFZr95uygvWDti12jgI&client_id=846812482710.apps.googleusercontent.com&client_secret=p90l6sTQFEk06mMQ577-aMWr&redirect_uri=https%3A%2F%2Fssl.rullionsolutions.com%2Fcato%2Fjsp%2Fmain.jsp%3Fguest_id=guest%26mode=post%26page_id=guest_home&grant_type=authorization_code
response:
 {
 "access_token" : "ya29.QwCrHyuVZ6bkgR8AAAAlSVgdMa6pezAM2DKnEyevHdE3UQTP13GXeWqtvk24jQ",
 "token_type" : "Bearer",
 "expires_in" : 3600,
 "refresh_token" : "1/umnTVgPDA8ocYeq5uCKuG74VVdNnFOhDVOKh1CWTjhw"
 }

3. Send Request to Calendar...
POST https://www.googleapis.com/calendar/v3/calendars/s04t9sjl0sga5j6kaslpi6mvfs%40group.calendar.google.com/events/
http headers:
 Authorization: Bearer ya29.QwCrHyuVZ6bkgR8AAAAlSVgdMa6pezAM2DKnEyevHdE3UQTP13GXeWqtvk24jQ
 Content-Type:  application/json
payload:
 {
 "summary": "OAuth Magic!",
 "start": { "dateTime": "2014-07-16T10:00:00Z" },
 "end":  { "dateTime": "2014-07-16T12:00:00Z" }
 }
response:
Date: Tue, 15 Jul 2014 17:57:45 GMT
Via: HTTPS/1.1 websensegateway.recruitment.rul
X-Content-Type-Options: nosniff
Age: 1
Content-Encoding: gzip
Vary: Origin
Content-Length: 513
X-XSS-Protection: 1; mode=block
Pragma: no-cache
Server: GSE
ETag: "-kakMffdIzB99fTAlD9HooLp8eo/MjgxMDg5NDEyOTgzMDAwMA"
X-Frame-Options: SAMEORIGIN
Content-Type: application/json; charset=UTF-8
Access-Control-Allow-Origin: chrome-extension://fhjcajmcbmldlhcimfajhfbgofnpcjmb
Access-Control-Expose-Headers: Cache-Control,Content-Encoding,Content-Length,Content-Type,Date,ETag,Expires,Pragma,Server
Cache-Control: no-cache, no-store, max-age=0, must-revalidate
Alternate-Protocol: 443:quic
Expires: Fri, 01 Jan 1990 00:00:00 GMT

{
"kind": "calendar#event",
"etag": "\"-kakMffdIzB99fTAlD9HooLp8eo/MjgxMDg5NDEyOTgzMDAwMA\"",
"id": "j0mls3seqi360utcuh6kqj061o",
"status": "confirmed",
"htmlLink": "https://www.google.com/calendar/event?eid=ajBtbHMzc2VxaTM2MHV0Y3VoNmtxajA2MW8gczA0dDlzamwwc2dhNWo2a2FzbHBpNm12ZnNAZw",
"created": "2014-07-15T17:57:44.000Z",
"updated": "2014-07-15T17:57:44.915Z",
"summary": "OAuth Magic!",
"creator": {
"email": "stephen.d.francis@gmail.com",
"displayName": "Stephen Francis"
},
"organizer": {
"email": "s04t9sjl0sga5j6kaslpi6mvfs@group.calendar.google.com",
"displayName": "RSL Delivery Team",
"self": true
},
"start": {
"dateTime": "2014-07-16T11:00:00+01:00"
},
"end": {
"dateTime": "2014-07-16T13:00:00+01:00"
},
"iCalUID": "j0mls3seqi360utcuh6kqj061o@google.com",
"sequence": 0,
"reminders": {
"useDefault": true
}
}
*/
