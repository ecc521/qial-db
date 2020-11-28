const http = require("http")
const path = require("path")
const fs = require("fs")
const child_process = require("child_process")

const dataDir = path.join(__dirname, "../", "data")
fs.mkdirSync(dataDir, {recursive: true})

const passwords = require("./validatePassword.js")
const generateJSON = require("./generateJSON.js")

const hostname = "0.0.0.0"
const httpport = 3000

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

async function httprequest(req,res) {
	console.log(req.url)
	res.setHeader('Access-Control-Allow-Origin', '*')

	//Handle preflight requests.
	if (req.method === "OPTIONS") {
		res.statusCode = 200
		res.setHeader("Access-Control-Allow-Headers", "*")
		res.end()
		return;
	}

	//Generate a salt and hash entry for the specified password.
	if (req.method === "POST" && req.url.includes("/auth/generateentry")) {
		let password = req.headers['qial-password']
		let entry = passwords.generateEntry(password)
		res.statusCode = 200
		res.setHeader('Content-Type', 'text/plain');
		res.end(entry);
		return
	}

	if (req.url.includes("/data.json")) {
		res.statusCode = 200
		res.setHeader('Content-Type', 'application/json')
		res.end(JSON.stringify(await generateJSON()))
		return;
	}

	if (req.method === "POST" && req.url.includes("/upload")) {

		let password = req.headers['qial-password']
		let filename = req.headers['qial-filename']
		console.log(filename)
		try {
			let valid = await passwords.authPassword(password)
			if (!valid) {
				throw new Error("Invalid Password")
			}
		}
		catch (e) {
			res.statusCode = 401
			res.setHeader('Content-Type', 'text/plain');
			res.end("Error in password processing: " + e.message);
			//Destroying the socket is causing apache to send a bad gateway error, rather than passing through this error. Browsers are clearly
			//not following the spec, because of difficulty in redesigning architecture. Since ingress to cloud isn't charged, we'll just let the
			//request proceed, then return the error - chunked transfer will stop this from being a major problem.
			//req.destroy(["Error in password processing: " + e.message])
			return;
		}

		//Now we can process the actual upload. The user is authorized.
		let action = req.headers["qial-action"]

		let writePath = path.join(dataDir, filename)

		//Validate the path is in the correct directory. Authorized doesn't mean overwrite our code authorized.
		if (writePath.indexOf(dataDir) !== 0) {
			res.statusCode = 403
			res.setHeader('Content-Type', 'text/plain');
			res.end("Writing into parent directories is prohibited. ");
			return;
		}
		console.log(writePath)

		let writeStream;
		if (action === "append") {
			//We may need to handle this in chunks, depending on how large this file is. We'll decide what to do based on this.
			writeStream = fs.createWriteStream(writePath, {
				flags: "a"
			})
		}
		else {
			//TODO: Either auto-rename, or provide the user an option.
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
	}

	if (req.url.includes("/download")) {
		let data = await getData(req)

		//We use the URL object to get search params, so the domain/host can be anything.
		let urlObj = new URL("localhost:/?" + data.toString())
		let names = urlObj.searchParams.get("names").split(",")

		for (let i=0;i<names.length;i++) {
			//Not sure if this is needed. Quite possibly ../ would make an invalid URL.
			if (path.resolve(dataDir, names[i]).indexOf(dataDir) !== 0) {
				res.statusCode = 403
				res.setHeader('Content-Type', 'text/plain');
				res.end("Reading parent directories is prohibited. ");
				return;
			}
		}

		//Send the user a zip file.
		//Since most of our files should be already compressed, and no compression is drastically faster, use compression level 0. 
		let zipper = child_process.spawn("zip", ["-0", "-"].concat(names), {
			cwd: dataDir,
			stido: ["ignore", "pipe", "pipe"] //Ingore stdin. Pipe others.
		})

		res.statusCode = 200;
		res.setHeader('Content-Type', 'application/zip');
		zipper.stdout.pipe(res) //Respond with the zip file.
		return;
	}

	res.statusCode = 501
	res.setHeader('Content-Type', 'text/plain');
	res.end("Server is unable to handle this request - Not Implemented");
}

const httpserver = http.createServer(async function(req, res) {
	try {
		return await httprequest(req, res)
	}
	catch (e) {
		console.log(e)
		res.statusCode = 500
		res.setHeader('Content-Type', 'text/plain');
		res.end("Internal Server Error: " + e.message);
	}
});

try {
	httpserver.listen(httpport, hostname, () => {
	  console.log(`Server running at http://${hostname}:${httpport}/`);
	});
}
catch(e) {
	console.error(e)
}


//Call at start, to begin processing of thumbnails, etc.
generateJSON()
