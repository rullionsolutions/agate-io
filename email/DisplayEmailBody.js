"use strict";

var UI = require("lazuli-ui/index.js");
var Rhino = require("lazuli-rhino/index.js");


module.exports = UI.Section.clone({
    id: "DisplayEmailBody",
    iframe_title: "Email Preview",
    iframe_width: "100%",
    iframe_height: "300px",
    iframe_scrolling: "no",
    iframe_frameborder: "0",
});


module.exports.defbind("renderEmailBody", "render", function (render_opts) {
    var body_field = this.record.getField("body");
    var style = body_field.getUneditableCSSStyle();
    var text = body_field.getText();
    var elem = this.getSectionElement();
    if (style) {
        elem.attr("style", style);
    }
    if (text) {
        this.record.cids.each(function (cid) {
            if (text.indexOf(cid.cid_uri) !== -1) {
                text = text.split(cid.cid_uri).join(cid.data_uri);
            }
        });

        elem.text(this.getIframeCode(text), true, true);
    }
});


module.exports.define("getIframeCode", function (iframe_html) {
    return "<iframe id='email_body_display_" + this.id + "' title='" + this.iframe_title + "' "
        + "style='width: " + this.iframe_width + "; height: " + this.iframe_height + "' "
        + "scrolling='" + this.iframe_scrolling + "' frameborder='" + this.iframe_frameborder + "' "
        + "src='" + Rhino.app.base_uri + "dyn/?mode=renderEmailPreview&page_id=" + this.owner.page.id
        + "&page_key=" + this.record.getKey() + "' "
        + "onload='(function () { $(\"#email_body_display_" + this.id + "\").height($($(\"#email_body_display_"
        + this.id + "\")[0].contentWindow.window.document).height())})()'"
        + "/>";
});
