window.url = "node/"
if (window.location.host.startsWith("127.0.0.1")) {
	window.url = "http://" + window.location.hostname + ":6928/"
}

window.Overlay = require("./src/overlay.js")
require("./src/upload.js")
require("./src/download.js")
require("./src/delete.js")

require("./src/previews.js")
require("./src/search.js")

require("./src/selections.js")
