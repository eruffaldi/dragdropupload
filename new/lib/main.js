
var pageMod = require("sdk/page-mod");

pageMod.PageMod({
  include: ["*"]
  contentScriptFile: data.url("main-check.js"),
  onAttach: function(worker) {
  	worker.port.emit("scan");
    /*worker.port.emit("getElements", tag);
    worker.port.on("gotElement", function(elementContent) {
      console.log(elementContent);
    });
*/
  }
});