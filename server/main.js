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

	//Generate a salt and hash entry for the specified password.
	if (req.method === "POST" && req.url === "/auth/generateentry") {
		let password = (await getData(req)).toString()
		let entry = passwords.generateEntry(password)
		res.statusCode = 200
		res.setHeader('Content-Type', 'text/plain');
		res.end(entry);
	}

	if (req.method === "POST" && req.url === "/upload") {

	}

}

const httpserver = http.createServer(httprequest);

try {
	httpserver.listen(httpport, hostname, () => {
	  console.log(`Server running at http://${hostname}:${httpport}/`);
	});
}
catch(e) {
	console.error(e)
}
