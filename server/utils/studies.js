/**
 * @overview Methods for accessing, creating, and modifying Studies. Handles database and filesystem components. 
 */

import fs from "fs";
import path from "path";

import Study from "../../lib/Study/index.js"
import {Level} from "level";

let studiesDatabasePath = path.join(global.dataDir, "studies_data")
let studiesDatabase = new Level(studiesDatabasePath, {valueEncoding: "json"})

let filesystemReferences = studiesDatabase.sublevel("refs") //key: studyID, value: RELATIVE_PATH_TO_STUDY_DIRECTORY_FROM_ROOTDIR
let studyMetadata = studiesDatabase.sublevel("meta") //Contains sublevels for all

/**
 * Obtain a list of all studies.
 * @returns {Study[]} - Array of Study objects.
 */
async function getAllStudies() {
	let studyIDs = await filesystemReferences.keys().all()

	let studies = studyIDs.map(studyID => getStudy(studyID))
	for (let i=0;i<studies.length;i++) {
		studies[i] = await studies[i]
	}
	return studies
}

/**
 * Obtains a Study.
 * @param {string} studyID - ID of study.
 * @returns {Study} - Study object.
 */
async function getStudy(studyID) {
	let sublevel = studyMetadata.sublevel(studyID)
	let [name, description] = await sublevel.getMany(["name", "description"])
	console.warn(name, description)

	return new Study({
		ID: studyID,
		name,
		description,
	})
}

function createStudy() {

}

function updateStudy() {

}

export {getAllStudies, getStudy, updateStudy}
