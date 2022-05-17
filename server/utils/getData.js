/**
 * Gets the body of a request.
 * @param {Object} request - Express request object.
 * @returns {Promise<Buffer>} requestBody - Body of request.
*/
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

export default getData
