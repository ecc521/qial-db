//Serves files for express.
const fs = require("fs")
const path = require("path")

const assureRelativePathSafe = require("./assureRelativePathSafe.js")

function requestHandler(req, res, next) {
	res.set("Access-Control-Allow-Origin", "*");

    let relativeSrc = decodeURIComponent(req.path)
	let extensions = ["", ".html", "index.html"]

	extensions.push(".gz") //Some files are only stored in their gzip forms (see precomputed)

	let relPath;
	let src;
	let findResult = extensions.find((ext) => {
        relPath = relativeSrc + ext
        assureRelativePathSafe(relPath)

		src = path.join(__dirname, relPath)
		if (fs.existsSync(src)) {
			return !fs.statSync(src).isDirectory()
		}
	})

	if (findResult === undefined) {
		//There is no file that matches this request.
		next()
		return
	}

	let srcToRead = src;
	let srcLastModified = fs.statSync(src).mtime;

	if (new Date(req.get("If-Modified-Since")) >= srcLastModified) {
		res.status(304)
		res.end()
		return
	}

    res.type(path.extname(src))

	//START OF PRECOMPRESSION/CACHE CONTROL/TYPING LOGIC

	if (findResult === ".gz") {
		res.set("Content-Encoding", "gzip")
	}

	//END OF PRECOMPRESSION/CACHE/TYPING CONTROL LOGIC


	let readStream = fs.createReadStream(srcToRead)

	//If-Modified-Since appears to be truncated to the second.
	//Therefore, we will send the current date -
	//Otherwise we risk some weird behavior if a request is made the same second a document is modified.
	//As is, it will just result in non-caching until the next request.
	res.set("Last-Modified", new Date())

	res.status(200)
	readStream.pipe(res)
}

module.exports = requestHandler
