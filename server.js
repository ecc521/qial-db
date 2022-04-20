import fs from "fs";
import path from "path";
import os from "os";
import http from "http";
import child_process from "child_process";
import zlib from "zlib";

process
  .on('unhandledRejection', (reason, p) => {
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })

import generateJSON from "./server/generateJSON.js"

import compression from "compression";
import express from "express";
import serveIndex from "serve-index";
import bodyParser from "body-parser";

import assureRelativePathSafe from "./assureRelativePathSafe.js"
import requestHandler from "./requestHandler.js"

import admin from "firebase-admin"

const serviceAccount = JSON.parse(fs.readFileSync("./server/qial-db-firebase-adminsdk-xyuqe-11205ec8c8.json", {encoding: "utf-8"}));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const users = db.collection("users")



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

app.use(express.urlencoded({ extended: false }));

function createAuthChecker(requiredPermissions = {}) {
    return function checkAuth(req, res, next) {
        if (req.headers.authtoken) {
            auth.verifyIdToken(req.headers.authtoken)
            .then((user) => {
                users.get(user.uid).then((querySnapshot) => {
                    let userDoc = querySnapshot.docs[0]
                    let data = userDoc.data()
                    console.log(data)

                    let permissions = data.permissions

                    for (let prop in requiredPermissions) {
                        if (permissions[prop] !== requiredPermissions[prop]) {
                            return res.status(403).send(`Permission ${prop} not posessed or insuffecient. `)
                        }
                    }

                    req.session = {
                        user,
                        data
                    }
                    next()
                }, (e) => {
                    res.status(500).send('Error Verifying Sign In: ' + e.message)
                })
            }).catch(() => {
                res.status(403).send('Sign In Invalid')
            });
        } else {
            res.status(403).send('Not Signed In')
        }
    }
}

app.all("*", (req, res, next) => {
    res.set("Strict-Transport-Security", "max-age=" + 60 * 60 * 24 * 365) //1 year HSTS.
    assureRelativePathSafe(req.path)
    next()
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

app.get("/data.json", async (req, res) => {
	res.status(200)
	res.type("json")
	res.end(JSON.stringify(await generateJSON()))
	return;
})

app.use("/upload", createAuthChecker({add: true}))
app.post("/upload", async (req, res) => {
	let filename = req.headers['qial-filename']

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





    //We can't use a true tmp dir, as then we'd need to rename into the data volume
    //Since you can't link across volumes, that would require a copy, which could be VERY expensive.
    //As such, create a subdirectory in the data directory, named tmp.
    //It will be deleted on server starts, and ignored elsewhere.
    let tmpindata = path.join(global.dataDir, "tmp")

    //Allocate a temporary directory based of a users UID.
    //These temporary directories are user specific, which should prevent others from modifying them.
    //Note that two people can technically upload the same file at once - so we must verify before we move.
    console.log(req.session.user)
    let userTempDirectory = path.join(tmpindata, req.session.user.uid)
    if (!fs.existsSync(userTempDirectory)) {fs.mkdirSync(userTempDirectory, {recursive: true})}

    //Determine write path for this file.
    let tempPath = path.join(userTempDirectory, filename)

    let writeStream;

    if (action === "create") {
        if (tempPath && fs.existsSync(tempPath)) {
            //Delete the existing file. Probably a reupload after previous attempt failed.
            fs.unlinkSync(tempPath)
        }

        //We will check the temporary file every 15 minutes. If it hasn't changed, it will be deleted.
        let pulseDuration = 1000 * 60 * 15

        let interval = setInterval(function() {
            if (Date.now() - fs.statSync(tempPath).mtime > pulseDuration) {
                fs.promises.rm(tempPath)
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


app.use("/fileops", createAuthChecker({write: true})) //TODO: Move permission unused.
app.all("/fileops", async (req, res) => {
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
		await fs.promises.unlink(filePath)
		//TODO: This can throw if filePath doesn't exist.
		res.end(`${path.basename(filePath)} deleted. Changes should appear shortly. `);
	}
	else if (req.method === "PATCH") {
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
