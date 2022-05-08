/**
 * @overview Handles main server operations - serving of HTML, CSS, JavaScript, and any files not covered by other handlers.
 */

 //Serves files for express.
 import fs from "fs";
 import path from "path";

 import assureRelativePathSafe from "../utils/assureRelativePathSafe.js"; //This may be unnecessary, however additional checks won't hurt.

 /**
  * Handles requests for files on disk.
  * @param {Object} req - Express request object.
  * @param {Object} res - Express response object.
  * @param {Function} next - Express callback (called if this handler cannot handle the request to pass onto next handler).
  */
 function generalRequestHandler(req, res, next) {
 	res.set("Access-Control-Allow-Origin", "*");

     let relativeSrc = decodeURIComponent(req.path)
 	let extensions = ["", ".html", "index.html"]

 	extensions.push(".gz") //Some files are only stored in their gzip forms (see precomputed)

 	let relPath;
 	let src;
 	let findResult = extensions.find((ext) => {
         relPath = relativeSrc + ext
         assureRelativePathSafe(relPath)

 		src = path.join(global.rootDir, relPath)
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

 export default generalRequestHandler
