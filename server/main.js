const http = require("http")

const hostname = "0.0.0.0"
const httpport = 3000

async function httprequest(req,res) {
	res.statusCode = 200;
	res.setHeader('Content-Type', 'text/plain');
	res.end('Not Implemented');
}

const httpserver = http.createServer(httprequest);

module.exports = function() {
	try {
		httpserver.listen(httpport, hostname, () => {
		  console.log(`Server running at http://${hostname}:${httpport}/`);
		});
	}
	catch(e) {
		console.error(e)
	}
}
