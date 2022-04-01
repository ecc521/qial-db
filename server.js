import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import * as http from "http";
import * as child_process from "child_process";
import * as zlib from "zlib";

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })

import generateJSON from "./server/generateJSON.js"

import compression from "compression";
import express from "express";
import session from "express-session";
import serveIndex from "serve-index";
import bodyParser from "body-parser";

import {getAuthorizedUsers} from "./server/auth.js"

import assureRelativePathSafe from "./assureRelativePathSafe.js"
import requestHandler from "./requestHandler.js"

import passport from "passport"
import {Strategy as LocalStrategy} from "passport-local"
// const passport = require('passport')
//   , LocalStrategy = require('passport-local').Strategy;


global.dataDir = path.join(path.dirname((new URL(import.meta.url)).pathname), "data")
fs.mkdirSync(global.dataDir, {recursive: true})

//Delete the tmp dir in dataDir, if it exists. (upload cache)
fs.rmSync(path.join(global.dataDir, "tmp"), {force: true, recursive: true})

//The cacheDir can be deleted at server restarts without damage. Potentially any time.
global.cacheDir = path.join(path.dirname((new URL(import.meta.url)).pathname), "cache")
fs.mkdirSync(global.cacheDir, {recursive: true})

global.precomputedDir = path.join(global.cacheDir, "precomputed")
fs.mkdirSync(global.precomputedDir, {recursive: true})


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

//app.set('trust proxy', 1) // trust first proxy
app.use(session({
  secret: 'awagewges', //What is this used for? Is it used to stop the client from modifying the cookies without us knowing?
  resave: false,
  name: "qial-session",
  saveUninitialized: true,
  cookie: {
	  secure: false, //Local dev.
	  maxAge: 86400 * 1000 //1 day.
  }
}))

app.use(bodyParser.urlencoded({ extended: false }));

app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser(function(user, done) {
  done(null, JSON.stringify(user));
});

passport.deserializeUser(function(user, done) {
  done(null, JSON.parse(user));
});

passport.use(new LocalStrategy(
  async function(username, password, done) {

	  	let authorizedUsers = await getAuthorizedUsers()

	  	let user = authorizedUsers[username.toLowerCase()]
	  	if (!user) {
			return done(null, false, { message: 'Incorrect username.' });
	  	}

	  	if (!isPasswordCorrect(password, user["Salt/Hash"])) {
			return done(null, false, { message: 'Incorrect password.' });
	  	}

		return done(null, user);
  }
));

app.all("*", (req, res, next) => {
    res.set("Strict-Transport-Security", "max-age=" + 60 * 60 * 24 * 365) //1 year HSTS.
    assureRelativePathSafe(req.path)
    next()
})

app.post('/login', passport.authenticate('local', {
	successRedirect: '/account',
	failureRedirect: '/login',
}));

app.post("/logout", (req, res) => {
	req.logout();
	res.redirect('/login');
})

app.get("/user", (req, res) => {
	let obj = req.user
	res.send(obj)
	res.end()
})

//Gets the body of a request.
function getData(request) {
	return new Promise((resolve, reject) => {
		let body = []
		request.on("data", function(chunk) {
			body.push(chunk)
		})
		request.on("end", function() {
			resolve(Buffer.concat(body))
		})
	})
}

app.post("/auth/generateentry", (req, res) => {
	//Generate a salt and hash entry for the specified password.
	let password = req.headers['qial-password']
	let entry = generateEntry(password)
	res.statusCode = 200
	res.setHeader('Content-Type', 'text/plain');
	res.end(entry);
	return
})

app.get("/data.json", async (req, res) => {
	res.status(200)
	res.type("json")
	res.end(JSON.stringify(await generateJSON()))
	return;
})

app.post("/upload", async (req, res) => {
	let password = req.headers['qial-password']
	let filename = req.headers['qial-filename']

	if (req?.user?.Add !== "y") {
		res.statusCode = 401
		res.setHeader('Content-Type', 'text/plain');
        //res.setHeader("Connection", "close") //Causes issues with Apache, where the error is not passed through.
		res.end("Missing permissions. You may not be signed in. ");
		return;
	}

	//Now we can process the actual upload. The user is authorized.
	let action = req.headers["qial-action"]

    let writePath = path.join(global.dataDir, filename) //Final destination.
    assureRelativePathSafe(filename)

    //Don't allow overwriting files - error.
    if (fs.existsSync(writePath)) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'text/plain');
        res.end("Uploads may not overwrite a file. Please pick a different name, or delete/move the file. ");
        return;
    }

    let tempPath = req?.session?.uploading?.[filename]
    let writeStream;

    if (action === "create") {
        //Allocate a temporary file.
        //These temporary files are user specific, which should prevent others from modifying them.
        //Note that two people can technically upload the same file at once - so we must verify before we move.

        if (!req.session.uploading) {
            req.session.uploading = Object.create(null)
        }

        if (tempPath && fs.existsSync(tempPath)) {
            //Delete the existing file. Probably a reupload after previous attempt failed.
            fs.unlinkSync(tempPath)
        }

        //We can't use a true tmp dir, as then we'd need to rename into the data volume
        //Since you can't link across volumes, that would require a copy, which could be VERY expensive.
        //As such, create a subdirectory in the data directory, named tmp.
        //It will be deleted on server starts, and ignored elsewhere.
        let tmpindata = path.join(global.dataDir, "tmp")
        if (!fs.existsSync(tmpindata)) {fs.mkdirSync(tmpindata, {recursive: true})}

        let tempdir = await fs.promises.mkdtemp(path.join(tmpindata, "qial")) //Review the mkdtemp example in docs before touching this. The design makes little sense.
        tempPath = path.join(tempdir, filename)
        req.session.uploading[filename] = tempPath //TODO: Could there be a race condition causing some not to get properly created? Overwritten by another? Seeing occasional no upload in progress errors, which would be related. Needs more investigation.

        //We will check the temporary file every 15 minutes. If it hasn't changed, it will be deleted.
        let pulseDuration = 1000 * 60 * 15

        let interval = setInterval(function() {
            //If the file does not exist,
            if (!fs.existsSync(tempPath)) {
                fs.promises.rm(tempdir, {recursive: true, force: true})
                clearInterval(interval)
            }
            else if (Date.now() - fs.statSync(tempPath).mtime > pulseDuration) {
                fs.promises.rm(tempdir, {recursive: true, force: true})
                delete req.session.uploading[filename]
                clearInterval(interval)
            }
        }, pulseDuration)

        writeStream = fs.createWriteStream(tempPath, {
			flags: "w"
		})
    }
    else if (action === "append") {
        if (!tempPath) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain');
            res.end("No upload in progress. You may have timed out. ");
            return;
        }

        writeStream = fs.createWriteStream(tempPath, {
			flags: "a"
		})
    }


    let closePromise = new Promise((resolve, reject) => {
        writeStream.on("finish", resolve)
        writeStream.on("error", reject)
    })

    req.pipe(writeStream)

    let last = (req.headers["qial-last"] === "last")
    if (last) {
        await closePromise

        if (fs.existsSync(writePath)) {
            res.statusCode = 400
            res.setHeader('Content-Type', 'text/plain');
            res.end("Unable to transfer file - destination occupied. A file may have been added or moved during your upload. ");
            return;
        }

        delete req.session.uploading[filename]
        fs.renameSync(tempPath, writePath)
    }

	res.statusCode = 200
	res.setHeader('Content-Type', 'text/plain');
	res.end("Success");
	return
})


app.post("/download", async (req, res) => {
	let data = req.body
    let names = data.names.split(",")

	for (let i=0;i<names.length;i++) {
        assureRelativePathSafe(names[i])
	}

	//Send the user a zip file.
	//Most of our files are already compressed, but not all.
	//We'll use compression level 6 here, which is default. Might need to revert this back if it's too slow/cpu heavy.
	//That said, the NodeJS download script is far better for big downloads, and GZIP will be used on all files,
	//except those that are uncompressable (like already gzipped files)
	let zipper = child_process.spawn("zip", ["-6", "-"].concat(names), {
		cwd: global.dataDir,
		stido: ["ignore", "pipe", "pipe"] //Ingore stdin. Pipe others.
	})

	res.statusCode = 200;
	res.setHeader('Content-Type', 'application/zip');
	zipper.stdout.pipe(res) //Respond with the zip file.
	return;
})


app.all("/fileops", async (req, res) => {
	let password = req.headers['qial-password']
	let filename = req.headers['qial-filename']

	let filePath = path.join(global.dataDir, filename)
    assureRelativePathSafe(filename)

    if (!fs.existsSync(filePath)) {
        res.statusCode = 400
        res.setHeader('Content-Type', 'text/plain');
        res.end("File does not exist. ");
        return;
    }

    if (fs.lstatSync(filePath).isDirectory()) {
        res.statusCode = 401
        res.setHeader('Content-Type', 'text/plain');
        res.end("Modifying directories is prohibited. ");
        return;
    }

	res.statusCode = 200
	res.setHeader('Content-Type', 'text/plain');

	if (req.method === "DELETE") {
		if (req?.user?.Delete !== "y") {
			res.statusCode = 401
			res.setHeader('Content-Type', 'text/plain');
			res.end("Missing permissions. You may not be signed in. ");
			return;
		}
		await fs.promises.unlink(filePath)
		//TODO: This can throw if filePath doesn't exist.
		res.end(`${path.basename(filePath)} deleted. Changes should appear shortly. `);
	}
	else if (req.method === "PATCH") {
		if (req?.user?.Move !== "y") {
			res.statusCode = 401
			res.setHeader('Content-Type', 'text/plain');
			res.end("Missing permissions. You may not be signed in. ");
			return;
		}
		let targetFileName = req.headers['qial-target-filename']
		let targetFilePath = path.join(global.dataDir, targetFileName)
        assureRelativePathSafe(targetFileName)

		//TODO: This can throw if it doesn't exist.
		await fs.promises.rename(filePath, targetFilePath)
		res.end(`${path.basename(filePath)} renamed to ${path.basename(targetFilePath)}. Changes should appear shortly. `);
	}
	return
})


//Serve remaining files.
app.all('*', requestHandler)

// app.all('*', (req, res, next) => {
//     res.set("Access-Control-Allow-Origin", "*");
//
//     let relativeSrc = decodeURIComponent(req.path)
// 	let extensions = ["", ".html", "index.html", ".br", ".gz"]
//     let extRelSrc;
// 	let src;
// 	let extension = extensions.find((ext) => {
//         extRelSrc = relativeSrc + ext
//         assureRelativePathSafe(extRelSrc)
//
// 		src = path.join(path.dirname((new URL(import.meta.url)).pathname), extRelSrc)
//
// 		if (fs.existsSync(src)) {
// 			return !fs.statSync(src).isDirectory()
// 		}
// 	})
//
//
// 	if (fs.existsSync(src)) {
// 		res.type(path.extname(src))
// 		let readStream = fs.createReadStream(src)
//
// 		if (extension === ".br") {
// 			res.type(path.extname(src.slice(0, -3)))
// 			let accepted = req.get("Accept-Encoding")
// 			if (accepted.includes("br")) {
// 				res.set("Content-Encoding", "br")
// 				readStream.pipe(res)
// 			}
// 			else {
// 				console.warn("Brotli not supported by requester. ")
// 				if (!fs.existsSync(
// 					src.slice(0, -3) + ".gz"
// 				)) {
// 					//Stream decompress off of disk.
// 					//We check brotli before gzip - if there is a gzip and brotli file, but brotli not supported, we
// 					//should use the gzip file to avoid the compression CPU.
// 					let decompressor = zlib.createBrotliDecompress()
// 					readStream.pipe(decompressor)
// 					readStream = decompressor
// 					readStream.pipe(res)
// 				}
// 				else {
//                     //Proceed to the gzip file. (Already precompressed - GZIP might be supported by client, which would save CPU and bandwidth)
//                     extension = ".gz"
// 				}
// 			}
// 		}
//
//         if (extension === ".gz") {
// 			res.type(path.extname(src.slice(0, -3)))
// 			let accepted = req.get("Accept-Encoding")
// 			if (accepted.includes("gzip")) {
// 				res.set("Content-Encoding", "gzip")
// 				readStream.pipe(res)
// 			}
// 			else {
// 				//Stream decompress off of disk.
// 				console.warn("GZIP not supported by requester. ")
// 				let decompressor = zlib.createUnzip()
// 				readStream.pipe(decompressor)
// 				readStream = decompressor
// 				readStream.pipe(res)
// 			}
// 		}
// 		else {
// 			readStream.pipe(res)
// 		}
// 	}
// 	else {
// 		next()
// 	}
// })

app.all("*", (req, res, next) => {
    serveIndex(path.dirname((new URL(import.meta.url)).pathname), {
		'icons': true,
		'view': "details" //Gives more info than tiles.
	})(req, res, next)
})

app.use("*", (req, res, next) => {
	res.status(404)
	res.type("text/plain")
	res.end("File Not Found")
})

const httpport = 8080
app.listen(httpport)


//Call at start, to begin processing of thumbnails, etc.
generateJSON()
