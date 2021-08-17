const fs = require("fs")
const path = require("path")

const daikon = require("daikon")

const getFilesInDirectory = require("./getFilesInDirectory.js")
const loadDataCSV = require("./loadDataCSV.js")

const generateThumbnails = require("./generateThumbnails.js")
const createPrecomputed = require("./createPrecomputed.js")
const generateTiffThumbnails = require("./generateTiffThumbnails.js")

const {createEmptyAnimal, createFile, normalizeCode, computeNamespace} = require("./generateJSON/formats.js")
const {parseAnimalCSV, mergeRowsWithinSheet, processFile} = require("./generateJSON/dataParser.js")

//Architecture:
// 1. Receive Request
// 2. Obtain list of all files
// 3. Iterate through CSV files (Excel file sheets count as a CSV)
// 3a. Merge animals within file
// 3b. Merge list of aminals with animals in file
// -  Add animal if needed
// -  Determine namespace
// -  Merge into namespace
// 4. Process DICOM files. Create new animals as necessary.
// 5. Assign image files where possible.
// 6. Final processing & send response


//TODO: We need a way to inform about generic issues, not related to an individual file.

async function generateJSON() {
	console.time("Gen")

   let files = await getFilesInDirectory(global.dataDir)
   files = files.map((filePath) => {return path.relative(global.dataDir, filePath)})
   //TODO: Lock down tmp directory. Hide all files here, prevent uploads to it (not here), and prevent deletions and renames within it.

   function reclaimFiles(reclaimedFiles, ...fileNames) {
	   //Reclaimed files is an array of files that have already been reclaimed, to make concationation easy.
	   //Passing an empty array works.

	   //Remove a file from files - it is associated with an animal.
	   fileNames.forEach((fileName) => {
		   if (fileName instanceof Array) {reclaimFiles(reclaimedFiles, ...fileName)}
		   else {
			   let index = files.indexOf(fileName)
			   if (index !== -1) {
				   reclaimedFiles.push(files.splice(index, 1)[0])
			   }
		   }
	   })
	   return reclaimedFiles
   }



	let allData = []


	//Animals will be linked together via the normalized Animal ID.
	let animals = Object.create(null)

	//TODO: Consider adding another function to normalize other animal properties.
	//Ex, M => male, F => female
	//Might also want to convert Strings to Numbers

	function mergeAnimals(animalsToMerge, name) {
		//Note: animalsToMerge might be a reference that we can't modify.
		//Deleting the Animal property is fine (doesn't matter), but we can't destroy it.
		//This code must be able to run multiple times using the same animalsToMerge
		let namespace = computeNamespace(name)

		let errors, warnings;

		 if (Object.keys(animalsToMerge).length === 0) {
			 errors = "No Animals Found/Check Format"
		 }

		 for (let id in animalsToMerge) {
			 let currentAnimal = animalsToMerge[id]
			 delete currentAnimal.Animal

			 if (!animals[id]) {
				 animals[id] = createEmptyAnimal(id)
			 }

			 let target = animals[id]
			 let prefix = ""
			 if (namespace) {prefix = namespace + "/"}

			 for (let inputProp in currentAnimal) {
				 let outputProp = prefix + inputProp

				 if (!target[outputProp]) {
					 target[outputProp] = currentAnimal[inputProp]
				 }
				 else {
					 //If the output property does not exist, do not copy.
					 warnings = "Conflicts within namespace"

					 //TODO: We will probably need to add merge - however keep in mind:

					 //If there are exactly identical results for a single property across trials, and those trials are across multiple sheets,
					 //uneven length arrays may result.

					 //The trials may be one per sheet, or multiple per sheet, or mixed, so we can't rely on only merging non-arrays,
					 //unless we waited until the end to compact arrays with all identical properties into a non-array

					 //Doing that, though, would still result in duplicate sheet with 5 trials having an output of 10 trials ([1,2,3,4,5,1,2,3,4,5])
				 }
			 }
		 }

		 return {errors, warnings}
	}


	files = files.filter((fileName) => {
		//TODO: We should probably make sure that either CSVs or XLSX sheets are processed first.
		//XLSX should probably go second, as they can have multiple sheets and cause conflicts more easily.

		let res = processFile(fileName)
		if (!res) {return true} //Not a data file.

		let sheets = res.sheets //If there was an error, res.sheets might not be defined, and there will be an error property on res.fileObj

		for (let sheetName in sheets) {
			let rows = sheets[sheetName]
			let sheetRes = mergeAnimals(rows, sheetName)

			//Give a warning for the specific sheet. If a sheet has multiple errors/warnings, we'll only show one.
			//TODO: Show errors for multiple sheets.

			let prefix = Object.keys(sheets).length === 1 ? "" : `Sheet ${sheetName} - `

			if (sheetRes.errors) {res.fileObj.errors = prefix + sheetRes.errors}
			if (sheetRes.warnings) {res.fileObj.warnings = prefix + sheetRes.warnings}
		}

		allData.push(res.fileObj)
	})



	//Now add DICOMs - merge into animals where possible, else create new ones.
	//We don't want to read every image in an entire series when the headers we care about are the same.

	//FOR PERFORMANCE:
	//We assume that ALL dicom files within the same directory are for THE SAME animal and have the same animal properties!
	//If the DICOM is in the datadir, that is ignored.

	let dicomDirs = {}
	console.log(files)

	for (let i=0;i<files.length;i++) {
		let fileName = files[i]
		if (fileName.endsWith(".dcm")) {
			let filePath = path.join(global.dataDir, fileName)
			let dir = path.dirname(filePath)

			async function addAnimalFromDICOM(filePath) {
				let buf = await fs.promises.readFile(filePath)
				let data = new DataView(daikon.Utils.toArrayBuffer(buf))

				let image = daikon.Series.parseImage(data)

				global.image = image

				//To dump all image metadata to console:
				// Object.keys(image.tagsFlat).forEach((id) => {
				// 	let tag = image.tagsFlat[id]
				// 	console.log(daikon.Dictionary.getDescription(tag.group,tag.element), tag.value, tag.group, tag.element)
				// })

				function formatDate(dateObj) {
					return `${dateObj.getMonth() + 1}/${dateObj.getDate()}/${dateObj.getFullYear()}`
				}

				let id = image.getPatientID()
				id = normalizeCode(id)
				let emptyAnimal = createEmptyAnimal(id)
				let animal = Object.assign(emptyAnimal, {
					//TODO: Figure out what some of the properties like PatientName correspond to in the CSVs.

					//TODO: How to use the StudyDate / time scan was taken? Maybe for date of death if we know this was exVivo?
					//TODO: How to use bodyPartExamined? (probably can't, as it's part of the scan, not the animal)
					Sex: image.getTag(16, 64).value[0],
					Modality: image.getTag(8, 96).value[0],
					DOB: formatDate(image.getTag(16, 48).value[0]),
					weight: image.getTag(16, 4144).value[0], //weight or weight_at_sacrifice?
				})


				let matchingAnimal = animals[animal.Animal]
				if (matchingAnimal) {
					//Are any animals going to have two different Modality values, due to use in two different studies?
					console.warn("Existing animal matches DICOM. We should merge properties, and figure out what to do if they don't match")
					return matchingAnimal
				}

				return animals[animal.Animal] = animal
			}

			let animal = dicomDirs[dir]
			if (!animal) {
				console.log(filePath)
				animal = await addAnimalFromDICOM(filePath)
				if (dir !== global.dataDir) {
					dicomDirs[dir] = animal
				}
			}

			//Add the DICOM to component files.
			//TODO: componentFiles will contain an entire series of DICOMs, but we don't have any thumbnails.
			//We should generate thumbnails. This would require processing the entire series at some point, and caching.
			animal.componentFiles.push(fileName)
 		}
	}

	//Remove DICOMs from files array - they are now all associated with Animals.
	files = files.filter(fileName => !fileName.endsWith(".dcm"))
	console.log(dicomDirs)

	for (let id in animals) {
		allData.push(animals[id])
	}

   for (let i=0;i<allData.length;i++) {
	   let item = allData[i]
	   if (item.type !== "animal") {continue} //Only process animals, no files.

	   //These are all the different ways that files can be identified along with an animal.
	   //We keep them seperate so we can pair with labels better.
	   let provisionalItems = [item.Animal, item.Animal.split("_").join("-"), item["SAMBA Brunno"], item.GRE, item.DWI].flat()

	   let relatedFiles = provisionalItems.map((itemsToCheck) => {
		   //Some animals, like with Animal 190610-1:1, can have multiple GRE and DWI identifiers - we need to allow for arrays or single values.
		   if (!(itemsToCheck instanceof Array)) {itemsToCheck = [itemsToCheck]}
		   itemsToCheck = itemsToCheck.filter(item => item) //Filter out blank identifiers, for empty boxes.
		   itemsToCheck = itemsToCheck.map((item) => {
			   //If one identifier is an exact subset of another animal's - ex, 191205-1 and 191205-10
			   //we could have issues, so we'll check to make sure that the next character is not a number.
			   return new RegExp(item + "[^0-9]")
		   })

		   return files.filter((fileName) => {
			   return itemsToCheck.some((item) => {
				   return fileName.match(item)
			   })
		   })
	   })


	   let processedFiles = [] //To avoid processing the same file twice with different identifiers.

	   //Each batch is all the files that matched with a specific identifier.
	   for (let i=0;i<relatedFiles.length;i++) {
		   let filesInBatch = relatedFiles[i]
		   item.componentFiles.push(...reclaimFiles([], ...filesInBatch)) //All related files are components, even if they aren't in a view.

		   //Like with Animal: 190909_12:1, multiple identifiers may match the same file.
		   //We will assume that the label files must have both identifiers as well, and will skip second identifier.
		   filesInBatch = filesInBatch.filter((item) => {
			   return !processedFiles.includes(item)
		   })
		   processedFiles.push(...filesInBatch)

		   function isNifti(fileName) {
			   return fileName.endsWith(".nii") || fileName.endsWith(".nii.gz")
		   }

		   function isTiff(fileName) {
			   return fileName.endsWith(".tif")
		   }

		   let imageFiles = filesInBatch.filter((fileName) => {
			   return isNifti(fileName) && !fileName.includes("label")
		   })

		   let labelFiles = filesInBatch.filter((fileName) => {
			   return isNifti(fileName) && fileName.includes("label")
		   })

		   //TODO: Handle labels. Probably search filename for word label.
		   for (let i=0;i<imageFiles.length;i++) {
			   let fileName = imageFiles[i]
			   let view = {
				   name: fileName,
				   filePath: fileName,
				   neuroglancer: {
					   source: fileName
				   }
			   }
			   await createPrecomputed(path.join(global.dataDir, fileName))

			  let matchingRAS = labelFiles.filter((labelName) => {
				  return fileName.toLowerCase().includes("ras") === labelName.toLowerCase().includes("ras")
			  })

			  if (matchingRAS.length === 1) {
				  let labelPath = matchingRAS[0]
				  //Generate and Cache the precomputed labels.
				  await createPrecomputed(path.join(global.dataDir, labelPath))
				  view.neuroglancer.labels = labelPath
			  }
			  else if (matchingRAS.length > 1 || labelFiles.length > 1) {
				  console.warn("Potential Matching Issues")
				  console.log(matchingRAS, labelFiles)
			  }

			  view.thumbnails = await generateThumbnails(path.join(global.dataDir, view.filePath)) //Generate the thumbnails files into cache.
			  item.views.push(view)
		   }

		   let tiffImageFiles = filesInBatch.filter((fileName) => {return isTiff(fileName)})

		   for (let i=0;i<tiffImageFiles.length;i++) {
			   let fileName = tiffImageFiles[i]
			   let view = {
				   name: fileName,
				   filePath: fileName
			   }

			  view.thumbnails = await generateTiffThumbnails(path.join(global.dataDir, view.filePath)) //Generate the thumbnails files into cache.
			  item.views.push(view)
		   }
	   }

	   item.componentFiles = item.componentFiles.map((fileName) => {
		   return createFile(fileName)
	   })
   }


   files.forEach((fileName) => {
	   allData.push(createFile(fileName))
   })

   function calc(item) {
	   let val = 0;
	   if (item.type === "animal") {val++}
	   if (item?.views?.length > 0) {val++}
	   return val
   }

   allData.sort((a, b) => {
	   return calc(b) - calc(a)
   })

   console.timeEnd("Gen")

   return {
	   data: allData
   }
}



let lastGenerated; //This can take a bit of time - return the last request generated.

//Don't run this multiple times at once. If an outstanding request is open, return it for any new requests as well.
//generateJSON may crash if it is run multiple times at once, or generate invalid thumbnails, etc.
let currentGeneration;

module.exports = async function() {
	if (!currentGeneration) {
		currentGeneration = generateJSON().then((res) => {
			lastGenerated = res
			currentGeneration = undefined
		}, (err) => {
			console.error(err)
			currentGeneration = undefined
		})
	}

	if (!lastGenerated) {
		await currentGeneration
	}

	return lastGenerated
}
