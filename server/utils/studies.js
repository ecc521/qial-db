/**
 * @overview Methods for accessing, creating, and modifying Studies. Handles database and filesystem components.
 */

import fs from "fs";
import path from "path";

import getStudyContents from "./getStudyContents.js"
import Study from "../../lib/Study/index.js"
import {Level} from "level";

let studiesDatabasePath = path.join(global.dataDir, "studies_data")
let studiesDatabase = new Level(studiesDatabasePath, {valueEncoding: "json"})

let filesystemReferences = studiesDatabase.sublevel("refs") //key: studyID, value: RELATIVE_PATH_TO_STUDY_DIRECTORY_FROM_STUDIES_DIR
let studyMetadata = studiesDatabase.sublevel("meta") //Contains sublevels for all

/**
 * Obtain a list of all studies.
 * @returns {Study[]} - Array of Study objects. ONLY CONTAINS METADATA. To get study contents, call getStudy directly with the includeContents option.
 */
async function getAllStudies() {
	let studyIDs = await filesystemReferences.keys().all()

	let studiesPromises = studyIDs.map(studyID => getStudy(studyID))

	let studies = []
	for (let studyPromise of studiesPromises) {
		let study = await studyPromise
		studies.push(study)
	}
	return studies
}

/**
 * Obtains a Study.
 * @param {string} studyID - ID of study.
 * @returns {Study} - Study object.
 */
async function getStudy(studyID, includeContents = false) {
	let sublevel = studyMetadata.sublevel(studyID)
	let [name, description] = await sublevel.getMany(["name", "description"])

	let study = new Study({
		ID: studyID,
		name,
		description,
	})

	let studyDirectory = path.join(global.studiesDir, studyID)
	study.path = path.relative(global.rootDir, studyDirectory)

	if (includeContents) {
		//TODO: To reduce network use, we need to avoid loading the individual data fields until needed.
		study.contents = await getStudyContents(studyDirectory)
	}

	return study
}

async function createStudy(newContents) {
	//Create a study, randomly assigning a study ID.
	//Study IDs will be 6 characters.
	//TODO: We should probably increase the study ID length if some number of attempts don't
	//come up with an ID to allow arbitrary scaling. However not a concern at the moment.

	let radix = 36
	let len = 6
	let newStudyID;

	while (true) {
		let min = radix ** (len - 1) //Inclusive
		let max = radix ** len //Exclusive
		let range = max - min
		let random = min + Math.floor(Math.random() * (range))

		newStudyID = random.toString(radix).toUpperCase()
		console.log(newStudyID)

		let pathOnDisk = await filesystemReferences.getMany([newStudyID])[0]
		console.log(pathOnDisk)
		if (!pathOnDisk) {
			console.log("Found!")
			break;
		}
	}

	//TODO: Now allocate a directory on disk and proceed.
	//TODO We want to make sure the directory doesn't conflict with existing directories.
	//But for now, just use study ID.

	await filesystemReferences.put(newStudyID, newStudyID)

	newContents.ID = newStudyID
	updateStudy(newContents)

	return newStudyID
}

async function updateStudy(newContents) {
	let studyID = newContents.ID
	let pathOnDisk = await filesystemReferences.get(studyID)
	if (!pathOnDisk) {
		throw "Study cannot be updated because it does not yet exist. "
	}

	let sublevel = studyMetadata.sublevel(studyID)
	await sublevel.batch([
		{
			type: "put",
			key: "name",
			value: newContents.name
		},
		{
			type: "put",
			key: "description",
			value: newContents.description
		},
	])
}

async function deleteStudy({
	ID,
}) {
	//Find the directory on filesystem.
	let fsdir = await filesystemReferences.get(ID)

	//Delete the fs reference.
	await studiesDatabase.batch([
		{
			type: "del",
			key: ID,
			sublevel: filesystemReferences
		},
		{
			type: "del",
			key: "name",
			sublevel: studyMetadata
		},
		{
			type: "del",
			key: "description",
			sublevel: studyMetadata
		},
	])

	//Delete the directory from filesystem.
	//We won't hold up execution on this - the study has been removed from studiesDatabase, so
	//it isn't a problem to clean up later if something goes wrong (as we can enumerate the filesystemReferences
	//and determine this directory should have been deleted)
	fs.promises.rm(path.join(global.studiesDir, fsdir), {force: true, recursive: true})
}

export {getAllStudies, getStudy, updateStudy, createStudy, deleteStudy}
