/* globals Packages */

"use strict";

var UI = require("lazuli-ui/index.js");
var Rhino = require("lazuli-rhino/index.js");


module.exports = UI.Page.clone({
    id: "ac_logo_upload",
    title: "Change Environment Logo",
    entity_id: "ac_file",
    security: {
        sysmgr: true,
    },
});


module.exports.sections.addAll([
    {
        id: "params",
        type: "FormParams",
        title: "Choose a file to upload",
        panel_initially_collapsed: false,
    },
]);


module.exports.defbind("setupParams", "setupEnd", function () {
    this.sections.get("params").fieldset.addFields([
        {
            id: "upload_file",
            type: "File",
            label: "Upload File",
            editable: true,
            allowed_extensions: "png,jpg,gpeg,gif",
        },
    ]);
});


module.exports.buttons.addAll([
    {
        id: "save",
        label: "Save",
        css_class: "btn-success",
    },
]);


module.exports.defbind("processLogo", "updateAfterSections", function (params) {
    var section = this.sections.get("params");
    var file_row;
    var is;
    var os;
    var to;

    if (params.page_button === "save") {
        if (section.fieldset.getField("upload_file").isChangedSincePreviousUpdate()) {
            file_row = section.fieldset.getField("upload_file").getRow(false);
            is = new Packages.java.io.BufferedInputStream(file_row.getInputStream());
            to = Rhino.app.app_id + "/style/logo.png";
            os = new Packages.java.io.BufferedOutputStream(new Packages.java.io.FileOutputStream(to));
            Packages.rsl.FileManager.pipe(is, os);
            is.close();
            os.close();
            /*
            if (java.lang.System.getProperty("os.name").indexOf( "Windows" ) > -1) {
                to = to.replace(/\//gi, "\\\\");
                print("cmd /c move "+to+" webapps\\\\vani_demo\\\\style\\\\logo.png");
                java.lang.Runtime.getRuntime().exec("cmd /c copy "+to+" webapps\\\\vani_demo\\\\style\\\\logo.png");
            } else {
                java.lang.Runtime.getRuntime().exec("mv " + to + " webapps/vani_demo/style/logo.png");
            }
            */
        }
        this.cancel();
        // this.redirect_url = "index.html#page_id=home";
        // this.active = false;
    }
});
