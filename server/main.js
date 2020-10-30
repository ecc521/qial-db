const http = require("http")
const path = require("path")
const fs = require("fs")

let dataDir = path.join(__dirname, "../", "data")
fs.mkdirSync(dataDir, {recursive: true})

const passwords = require("./validatePassword.js")

const hostname = "0.0.0.0"
const httpport = 3000

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
