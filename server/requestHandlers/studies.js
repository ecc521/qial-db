/**
 * @overview Handles server requests related to Studies - specifically creation, deletion, and obtaining Study metadata.
 */

import {checkAuth} from "../utils/auth.js";
import {getAllStudies, createStudy, updateStudy, getStudy, deleteStudy} from "../utils/studies.js"
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
	else if (req.query.type === "get") {
		let studyID = req.query.studyID
		let result = await getStudy(req.query.studyID, true) //Include study contents as well. 
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
		//TODO: Deleting a study is a highly concerning operation. We might want additional access control.
		let obj = JSON.parse(await getData(req))

		await checkAuth(req, res, {write: true})
		await deleteStudy(obj)
		res.status(200)
		res.end()
		return
	}
	else {
		res.status(400)
		res.end("Unknown query type " + req.query.type)
		return
	}
}

export default studiesHandler
