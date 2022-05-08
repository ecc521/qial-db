/**
 * @overview Handles server requests related to Studies - specifically creation, deletion, and obtaining Study metadata.
 */

import {checkAuth} from "../utils/auth.js";
import {getAllStudies} from "../utils/studies.js"

/**
 * Handles a request to get, set (create/update), or delete a study.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
async function studiesHandler(req, res) {
	if (req.query.type === "get") {
		let result = await getAllStudies()
		res.status(200)
		console.log(result)
		res.end(result)
		return
	}
	else if (req.query.type === "set") {
		//If the study exists, check write permission, else check add permission.
		await checkAuth(req, res, {add: true})
		res.status(500)
		res.end("Setting studies not yet supported. ")
		return
	}
	else if (req.query.type === "delete") {
		//Deleting a study is a highly concerning operation. We might want additional access control.
		await checkAuth(req, res, {write: true})
		res.status(500)
		res.end("Deleting studies not yet supported. ")
		return
	}
	else {
		res.status(400)
		res.end("Unknown query type " + req.query.type)
		return
	}
}

export default studiesHandler
