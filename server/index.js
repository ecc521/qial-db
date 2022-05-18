/**
 * @overview Starts up an Express webserver and registers handlers.
 */


 //TODO: We want to initialize generation of all study cache when the server is started. 


import http from "http";

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })

import generateJSON from "./generateJSON.js"

import compression from "compression";
import express from "express";
import serveIndex from "serve-index";
// import bodyParser from "body-parser";

import assureRelativePathSafe from "./utils/assureRelativePathSafe.js"

import studiesHandler from "./requestHandlers/studies.js"
import generalRequestHandler from "./requestHandlers/general.js"
import fileopHandler from "./requestHandlers/fileops.js"
import uploadHandler from "./requestHandlers/uploads.js"
import downloadHandler from "./requestHandlers/downloads.js"


let app = express()
app.disable('x-powered-by')

//Compress all responses
app.use(compression({
	filter: (req, res) => {
		let type = res.getHeader("Content-Type")
		if (
			type === "image/webp"
			|| type === "application/gzip"
		) {
			return false
		}
		else {
			return true
		}
	},
}))

// app.use(express.urlencoded({ extended: false }));
// app.use(express.json());


app.all("*", (req, res, next) => {
    res.set("Strict-Transport-Security", "max-age=" + 60 * 60 * 24 * 365) //1 year HSTS.
    assureRelativePathSafe(req.path) //Protect against path traversal.
    next()
})

//Register handlers.
app.all("/studies", studiesHandler)
app.all("/download", downloadHandler)
app.all("/upload", uploadHandler)
app.all("/fileops", fileopHandler)
app.all("*", generalRequestHandler)


//Serve directory listings.
app.all("*", (req, res, next) => {
    serveIndex(global.rootDir, {
		'icons': true,
		'view': "details" //Gives more info than tiles.
	})(req, res, next)
})

//404 if nothing could serve the request.
app.use("*", (req, res, next) => {
	res.status(404)
	res.type("text/plain")
	res.end("File Not Found")
})

//Start the server.
const httpport = 8080
app.listen(httpport)
