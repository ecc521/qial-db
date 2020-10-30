const http = require("http")
const passwords = require("./validatePassword.js")

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



	if (req.method === "POST" && req.url.includes("/upload")) {

		let data = getData(req) //Don't await yet.
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
			req.pause()
			res.statusCode = 403
			res.setHeader('Content-Type', 'text/plain');
			res.setHeader('Connection', 'close'); //End the connection.
			res.end("Error in password processing: " + e.message);
			return;
		}

		//Now we can process the actual upload. The user is authorized.
		data = await data

		console.log(data.length)

		res.statusCode = 200
		res.setHeader('Content-Type', 'text/plain');
		res.end("Upload Success");

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
