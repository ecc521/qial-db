/**
 * @overview Handles server requests related to Studies - specifically creation, deletion, and obtaining Study metadata.
 */

import {checkAuth} from "../utils/auth.js";
import {getAllStudies, createStudy, updateStudy, getStudy} from "../utils/studies.js"
import getData from "../utils/getData.js"


/**
 * Handles a request to get, set (create/update), or delete a study.
 * @param {Object} req - Express request object.
 * @param {Object} res - Express response object.
 */
async function studiesHandler(req, res) {
	if (req.query.type === "list") {
		let result = await getAllStudies()
		res.status(200)
		res.setHeader('content-type', 'application/json');
		res.end(JSON.stringify(result))
		return
	}
	else if (req.query.type === "set") {
		let obj = JSON.parse(await getData(req))
		let studyID = obj.ID
		if (obj.ID) {
			//Edit existing study. Error if ID does not exist.
			await checkAuth(req, res, {write: true})
			await updateStudy(obj)
		}
		else {
			//Create new study.
			await checkAuth(req, res, {add: true})
			studyID = await createStudy(obj)
		}

		res.status(200)
		res.setHeader('content-type', 'application/json');
		let studyObj = await getStudy(studyID)
		res.end(JSON.stringify(studyObj))
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
