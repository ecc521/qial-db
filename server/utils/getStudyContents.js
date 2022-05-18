import fs from "fs"
import path from "path"
import {Buffer} from "buffer"
import yauzl from "yauzl" //Zip Library
import daikon from "daikon" //DICOM Parser

import getFilesInDirectory from "./getFilesInDirectory.js"

import {normalizeCode, computeNamespace} from "../generateJSON/formats.js"
import {parseAnimalCSV, mergeRowsWithinSheet, processFile} from "../generateJSON/dataParser.js"

import {accessPrecomputed, createPrecomputed} from "../precomputed.js"

import File from "../../lib/File/index.js"
import Scan from "../../lib/Scan/index.js"
import Subject from "../../lib/Subject/index.js"


let queue = []

//FIFO. Note that we might need to optimize so not O^2 and potential memory "leak" (more like buildup)
//TODO: As long as we don't have multiple outstanding calls on the same file, these calls can and should be paralellized.
//Though do keep in mind potential memory constraints. So potentially do smaller files in paralell, with small decided based on available memory?
function addToQueue(callback, ...args) {
	let waitPromise = new Promise((resolve, reject) => {
		queue.push(resolve)
	})

	if (queue.length === 1) {
		//If we are the only item queued, proceed.
		queue[0]()
	}

	waitPromise.then(() => {
		//Done waiting.
		console.log(`There are ${queue.length} items in queue. `)
		return new Promise((resolve, reject) => {
			try {
				let waitFor = callback(...args)
				if (waitFor?.then) {waitFor.then(resolve, reject)} //Might be a promise, might not.
				else {resolve()}
			}
			catch (e) {reject(e)}
		})
	}).finally(() => {
		queue.shift()
		queue?.[0]?.() //Call
	})
}

//Return if cached, else add to queue.
async function obtainPrecomputed(filePath) {
	console.log(filePath)
	let precomputed = await accessPrecomputed(filePath)
	if (precomputed) {return precomputed}

	addToQueue(createPrecomputed, filePath)
}


//Known Flaws:
//Compression bomb type attacks should be covered, even though users must be authenticated.
//We would need to defend against GZIP bombs, possibly other types of compression in the future.

async function getStudyContents(relativeStudyPath) {
	let studyDirectory = path.join(global.studiesDir, relativeStudyPath, "data")
	console.log(studyDirectory)

	//When the study is opened, ensure it is initialized.
	if (!fs.existsSync(studyDirectory)) {
		fs.mkdirSync(studyDirectory, {recursive: true})
	}

   let files = await getFilesInDirectory(studyDirectory)
   files = files.map((filePath) => {return path.relative(studyDirectory, filePath)})

   let data = {
	   Files: new Map(),
	   Scans: new Map(),
	   Subjects: new Map(),
   }

	//Obtains the Subject if it exists, else creates a new one.
   function obtainSubject(subjectID) {
	   let subject = data.Subjects.get(subjectID) || new Subject({ID: subjectID})
	   if (!data.Subjects.has(subjectID)) {
		   data.Subjects.set(subjectID, subject)
	   }

	   return subject
   }

   //Assemble all files.
   for (let fileName of files) {
	   let stats = fs.statSync(path.join(studyDirectory, fileName))
	   let file = new File({
		   path: fileName,
		   size: stats.size,
		   lastModified: new Date(stats.mtime).getTime(),
	   })
	   data.Files.set(fileName, file)
   }

   console.log(data)
   console.log(data.Files)

   //Assemble all non-DICOM scans.
   //TODO: Still need to handle labels
   for (let fileName of data.Files.keys()) {
	   let isNonDICOMScan = fileName.endsWith(".nii") || fileName.endsWith(".nii.gz") || fileName.endsWith(".tif") || fileName.endsWith(".tiff")
	   if (!isNonDICOMScan) {continue}

	   let filePath = path.join(studyDirectory, fileName)

	   let scanID = fileName

	   let scan = new Scan({
		   //TODO: Add more details here, and process the scans.
		   ID: scanID,
		   sourceFiles: [fileName],
		   precomputed: await obtainPrecomputed(filePath)
	   })
	   data.Scans.set(scanID, scan)
   }

   console.log(data)


	//Process all DICOM scans.
	//For now, all DICOMs in a DICOM series and only DICOMs in that series must be located in a single zip file.
   	//For now we will assume all zip files are DICOM images.
	for (let fileName of data.Files.keys()) {
 	   let isDICOMScan = fileName.endsWith(".zip")
 	   if (!isDICOMScan) {continue}

	   let filePath = path.join(studyDirectory, fileName)

	   function formatDate(dateObj) {
	   		return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`
	   	}

	   	function parseDICOM(buf) {
	   		let data = new DataView(daikon.Utils.toArrayBuffer(buf))
	   		let image = daikon.Series.parseImage(data)
	   		return image
	   	}

	   let dicomProcess = new Promise((resolve, reject) => {
		   yauzl.open(filePath, {lazyEntries: true}, function(err, zipfile) {
			   if (err) {reject(err)};

			   zipfile.on("error", reject)
			   zipfile.on("close", resolve)
			   zipfile.on("entry", function(entry) {
				   //Since lazyEntires is true, entries will be buffered until we process the previous entry.
				   //If we reach a single valid DICOM entry, we will add the ZIP and stop processing.
				   if (/\/$/.test(entry.fileName)) {
					   //This is a directory. Skip (directories are implicit if files are within it or subdirectories - and we don't care about empty directories)
					   zipfile.readEntry();
				   }
				   else if (!entry.fileName.includes(".dcm")) {
					   zipfile.readEntry() //Only parse files labeled .dcm - we might need to add more formats later.
				   }
				   else {
					   //Read File.
					   zipfile.openReadStream(entry, function(err, readStream) {
						   //Proceed to next entry if the current one errors.
						   if (err) {zipfile.readEntry(); console.error(err)}
						   readStream.on("error", function(e) {
							   zipfile.readEntry()
							   console.error(e)
						   })

						   //Buffer the stream. Yes. Really.
						   let bufs = []
						   readStream.on("data", (data) => {bufs.push(data)})
						   readStream.on("end", function() {
							   //If the DICOM is valid, add it and be done. Otherwise, proceed to next entry.
							   let buf = Buffer.concat(bufs)

							   try {
								   let image = parseDICOM(buf)

								   let subject = obtainSubject(normalizeCode(image.getPatientID()))
								   Object.assign(subject, {
									   //TODO: We use scan objects now, so the below TODO statements need to be revisited as to new info that could possibly be extracted.
									   //TODO: Figure out what some of the properties like PatientName correspond to in the CSVs.

									   //To dump all image metadata to console:
							   		// Object.keys(image.tagsFlat).forEach((id) => {
							   		// 	let tag = image.tagsFlat[id]
							   		// 	console.log(daikon.Dictionary.getDescription(tag.group,tag.element), tag.value, tag.group, tag.element)
							   		// })



									   //TODO: How to use the StudyDate / time scan was taken? Maybe for date of death if we know this was exVivo?
									   //TODO: How to use bodyPartExamined? (probably can't, as it's part of the scan, not the animal)
									   Sex: image.getTag(16, 64).value[0],
									   DOB: formatDate(image.getTag(16, 48).value[0]),
									   weight: image.getTag(16, 4144).value[0], //weight or weight_at_sacrifice?
								   })
								   subject.addDataSources(fileName)

								   //While DICOMs should have some identifiers we could use,
								   //right now we will just use the fileName of the zip file containing the DICOMs.
								   let scanID = fileName

								   let precomputedPromise = obtainPrecomputed(path.join(studyDirectory, fileName))
								   precomputedPromise.then((precomputed) => {
									   let scan = new Scan({
										   ID: scanID,
										   sourceFiles: [fileName],
										   scanType: image.getTag(8, 96).value[0],
										   precomputed,
									   })
									   data.Scans.set(scanID, scan)
									   subject.addScanIDs(scanID)

									   zipfile.close()
								   })
							   }
							   catch (e) {
								   console.error(e)
								   zipfile.readEntry()
							   }
						   });
					   });
				   }
			   });

			   zipfile.readEntry(); //Read the first entry.
		   });
	   })

	   try {
		   await dicomProcess
	   }
	   catch (e) {
		   console.warn("Error parsing DICOM: ", fileName, e)
	   }
    }



   //Assemble all non-DICOM Animals.
   for (let fileName of data.Files.keys()) {
	   //TODO: Some of these sheets contain a property "Modality"
	   //This should be in the scanType of the Scan, not in the Animal, as it is possible an animal receives multiple types of scans.

	   //Process CSV and XLSX sheets.
	   //TODO: We should probably make sure that either CSVs or XLSX sheets are processed first.
	   //XLSX should probably go second, as they can have multiple sheets and cause conflicts more easily.
	   let file = data.Files.get(fileName)
	   let res = processFile(file, studyDirectory)
	   if (!res) {continue} //Not a data file.

	   let sheets = res.sheets //If there was an error, res.sheets might not be defined, and there will be an error property on res.fileObj

	   // let subject = obtainSubject(normalizeCode(image.getPatientID()))
	   // Object.assign(subject, {
		//    //TODO: Figure out what some of the properties like PatientName correspond to in the CSVs.
	   //
		//    //TODO: How to use the StudyDate / time scan was taken? Maybe for date of death if we know this was exVivo?
		//    //TODO: How to use bodyPartExamined? (probably can't, as it's part of the scan, not the animal)
		//    Sex: image.getTag(16, 64).value[0],
		//    DOB: formatDate(image.getTag(16, 48).value[0]),
		//    weight: image.getTag(16, 4144).value[0], //weight or weight_at_sacrifice?
	   // })
	   // subject.addDataSources(fileName)



	   for (let sheetName in sheets) {
		   let rows = sheets[sheetName]
		   let namespace = computeNamespace(sheetName)

		   let prefix = ""
		   if (namespace) {prefix = namespace + "/"}


	 		for (let subjectID in rows) {
				let subject = obtainSubject(normalizeCode(subjectID))

				let newData = rows[subjectID]
				subject.addDataSources(`${fileName}`)
	 			delete newData.Animal

				if (typeof newData?.Sex === "string") {
					if (newData?.Sex?.toLowerCase() === "male") {newData.Sex = "M"}
					else if (newData?.Sex?.toLowerCase() === "female") {newData.Sex = "F"}	
				}

	 			for (let inputProp in newData) {
	 				let outputProp = prefix + inputProp

	 				if (!subject[outputProp]) {
	 					subject[outputProp] = newData[inputProp]
	 				}
	 				else {
	 					//If the output property already exists, do not copy.
	 					//warnings = "Conflicts within namespace"

	 					//TODO: We will probably need to add merge - however keep in mind:

	 					//If there are exactly identical results for a single property across trials, and those trials are across multiple sheets,
	 					//uneven length arrays may result.

	 					//The trials may be one per sheet, or multiple per sheet, or mixed, so we can't rely on only merging non-arrays,
	 					//unless we waited until the end to compact arrays with all identical properties into a non-array

	 					//Doing that, though, would still result in duplicate sheet with 5 trials having an output of 10 trials ([1,2,3,4,5,1,2,3,4,5])
	 				}
	 			}
	 		}

		   //Give a warning for the specific sheet. If a sheet has multiple errors/warnings, we'll only show one.
		   //TODO: Show errors for multiple sheets.

		   // let prefix = Object.keys(sheets).length === 1 ? "" : `Sheet ${sheetName} - `
		   //
		   // if (sheetRes.errors) {res.fileObj.errors = prefix + sheetRes.errors}
		   // if (sheetRes.warnings) {res.fileObj.warnings = prefix + sheetRes.warnings}
	   }

	   console.log(fileName)
	   console.log(res.fileObj)
	   console.log(res.sheets)
   }

   //Link Subjects and Scans.
   for (let scanID of data.Scans.keys()) {
	   let scan = data.Scans.get(scanID)
	   //If a Scan matches more than one Subject, we will raise a warning.

	   let matchingSubjectIDs = []

	   for (let subjectID of data.Subjects.keys()) {
		   let subject = data.Subjects.get(subjectID)

		   // //These are all the different ways that files can be identified along with an animal.
		   // //We keep them seperate so we can pair with labels better.
		   let provisionalItems = [subjectID, subjectID.split("_").join("-"), subject["SAMBA Brunno"], subject.GRE, subject.DWI]
		   		.flat() //Some of these items may be arrays - expand them.
				.filter(item => item) //Filter out undefined items and empty strings.

		   for (let item of provisionalItems) {
			   //If one identifier is an exact subset of another animal's - ex, 191205-1 and 191205-10
			   //we could have issues, so we'll check to make sure that the next character is not a number.

			   let regexp = new RegExp(item + "[^0-9]")
			   if (scanID.match(regexp)) {
				   matchingSubjectIDs.push(subjectID)
				   subject.addScanIDs(scanID)
				   scan.setSubjectID(subjectID)
				   break;
			   }
		   }
	   }

	   if (matchingSubjectIDs.length > 1) {
		   console.warn("Multiple subjects matched scan", matchingSubjectIDs, scanID)
	   }
   }

	console.log(data)

	//Convert Maps to Objects for stringification.
	for (let prop in data) {
		if (data[prop] instanceof Map) {
			data[prop] = Object.fromEntries(data[prop])
		}
	}

	//TODO: We should sort either client or server side to put Subjects with more imaging scans higher up.
	// function calc(item) {
	// 	let val = 0;
	// 	if (item.type === "animal") {val++}
	// 	if (item?.views?.length > 0) {val++}
	// 	return val
	// }
	//
	// allData.sort((a, b) => {
	// 	return calc(b) - calc(a)
	// })

   return data
}


export default getStudyContents
