// import "./auth.js"
// import "./upload.js"
// import "./download.js"
// import "./delete.js"
// import "./previews.js"
// import "./selections.js"

window.currentParams = new URLSearchParams(window.location.hash.slice(1)) //Used to keep currentViewLink in sync between search.js and graphs.js

await import("./auth.js")
await import("./upload.js")
await import("./download.js")
await import("./delete.js")
await import("./previews.js")
await import("./selections.js")
