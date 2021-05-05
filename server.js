const http = require("http")
const path = require("path")
const fs = require("fs")
const child_process = require("child_process")
const zlib = require("zlib")

global.dataDir = path.join(__dirname, "data")
fs.mkdirSync(global.dataDir, {recursive: true})

//The cacheDir should be able to be deleted at reboots, etc, without damage. Ideally, at any time, just with a delay.
global.cacheDir = path.join(__dirname, "cache")
fs.mkdirSync(global.cacheDir, {recursive: true})


global.thumbnailsDir = path.join(global.cacheDir, "thumbnails")
fs.mkdirSync(global.thumbnailsDir, {recursive: true})

global.precomputedLabelsDir = path.join(global.cacheDir, "precomputedlabels")
fs.mkdirSync(global.precomputedLabelsDir, {recursive: true})



const passwords = require("./server/validatePassword.js")
const generateJSON = require("./server/generateJSON.js")

const compression = require('compression')
const express = require('express')
const serveIndex = require('serve-index')

let app = express()

//Compress all responses
app.use(compression())


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
	let entry = passwords.generateEntry(password)
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
	console.log(filename)

	let auth = await passwords.authPassword(password, [true, false, false])
	if (auth.authorized !== true) {
		res.statusCode = 401
		res.setHeader('Content-Type', 'text/plain');
		res.end("Error in password processing: " + auth.message);
		//Destroying the socket is causing apache to send a bad gateway error, rather than passing through this error.
		//Since I haven't been able to find a solution to that problem, and browsers have intentionally deviated from the spec ("too hard to redesign")
		//we won't close the socket, as Google Cloud ingress isn't charged, and chuncked transfer means we won't waste much anyway.
		return;
	}


	//Now we can process the actual upload. The user is authorized.
	let action = req.headers["qial-action"]

	let writePath = path.join(global.dataDir, filename)

	if (writePath.indexOf(global.dataDir) !== 0) {
		res.statusCode = 403
		res.setHeader('Content-Type', 'text/plain');
		res.end("Writing into parent directories is prohibited. ");
		return;
	}
	console.log(writePath)

	let writeStream;
	if (action === "append") {
		writeStream = fs.createWriteStream(writePath, {
			flags: "a"
		})
	}
	else {
		if (fs.existsSync(writePath)) {
			res.statusCode = 400
			res.setHeader('Content-Type', 'text/plain');
			res.end("Uploads may not overwrite a file. You must delete this file seperately. ");
			return;
		}
		writeStream = fs.createWriteStream(writePath, {
			flags: "w"
		})
	}

	req.pipe(writeStream)

	res.statusCode = 200
	res.setHeader('Content-Type', 'text/plain');
	res.end("Success");
	return
})


app.get("/download", async (req, res) => {
	let data = await getData(req)

	//We use the URL object to get search params, so the domain/host can be anything.
	let urlObj = new URL("localhost:/?" + data.toString())
	let names = urlObj.searchParams.get("names").split(",")

	for (let i=0;i<names.length;i++) {
		if (path.resolve(global.dataDir, names[i]).indexOf(global.dataDir) !== 0) {
			res.statusCode = 403
			res.setHeader('Content-Type', 'text/plain');
			res.end("Reading parent directories is prohibited. ");
			return;
		}
	}

	//Send the user a zip file.
	//Since most of our files should be already compressed, and no compression is drastically faster, use compression level 0.
	let zipper = child_process.spawn("zip", ["-0", "-"].concat(names), {
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
	console.log(filename)


	let auth = await passwords.authPassword(password, (req.method==="DELETE")?[false, false, true]:[false, true, false])
	if (auth.authorized !== true) {
		res.statusCode = 401
		res.setHeader('Content-Type', 'text/plain');
		res.end("Error in password processing: " + auth.message);
		//Destroying the socket is causing apache to send a bad gateway error, rather than passing through this error.
		//Since I haven't been able to find a solution to that problem, and browsers have intentionally deviated from the spec ("too hard to redesign")
		//we won't close the socket, as Google Cloud ingress isn't charged, and chuncked transfer means we won't waste much anyway.
		return;
	}

	let filePath = path.join(global.dataDir, filename)

	if (filePath.indexOf(global.dataDir) !== 0) {
		res.statusCode = 403
		res.setHeader('Content-Type', 'text/plain');
		res.end("Modifying parent directories is prohibited. ");
		return;
	}
	console.log(filePath)

	res.statusCode = 200
	res.setHeader('Content-Type', 'text/plain');

	if (req.method === "DELETE") {
		await fs.promises.unlink(filePath)
		res.end(`${path.basename(filePath)} deleted. Changes should appear on reload. `);
	}
	else if (req.method === "PATCH") {
		let targetFileName = req.headers['qial-target-filename']
		let targetFilePath = path.join(global.dataDir, targetFileName)

		if (targetFilePath.indexOf(global.dataDir) !== 0) {
			res.statusCode = 403
			res.setHeader('Content-Type', 'text/plain');
			res.end("Writing into parent directories is prohibited. ");
			return;
		}

		await fs.promises.rename(filePath, targetFilePath)
		res.end(`${path.basename(filePath)} renamed to ${path.basename(targetFilePath)}. Changes should appear on reload. `);
	}
	return
})


//Serve remaining files.
app.use('*', (req, res, next) => {
	res.set("Access-Control-Allow-Origin", "*");

	let relativeSrc = req.originalUrl

	let extensions = ["", ".html", "index.html", ".gz"]
	let src;
	let extension = extensions.find((ext) => {
		src = path.join(__dirname, relativeSrc + ext)
		if (fs.existsSync(src)) {
			return !fs.statSync(src).isDirectory()
		}
	})

	if (fs.existsSync(src)) {
		res.type(path.extname(src))
		let readStream = fs.createReadStream(src)

		//Stream decompress off of disk.
		if (extension === ".gz") {
			res.type("txt") //We'll set a compressable type - this file must be compressible if we have it precompressed.

			let decompressor = zlib.createUnzip()
			readStream.pipe(decompressor)
			readStream = decompressor
		}

		readStream.pipe(res)
	}
	else {
		next()
	}
})

app.use("*", (req, res, next) => {
	serveIndex(path.join(__dirname, req.originalUrl), {
		'icons': true,
		'view': "details" //Gives more info than tiles.
	})(req, res, next)
})

app.use("*", (req, res, next) => {
	res.status(404)
	res.type("text/plain")
	res.end("File Not Found")
})

const httpport = 8000
app.listen(httpport)


//Call at start, to begin processing of thumbnails, etc.
generateJSON()
