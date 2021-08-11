const fs = require("fs")
const path = require("path")

const loadDataCSV = require("./loadDataCSV.js")

const generateThumbnails = require("./generateThumbnails.js")
const createPrecomputed = require("./createPrecomputed.js")
const generateTiffThumbnails = require("./generateTiffThumbnails.js")

const csvParse = require('csv-parse/lib/sync')
const xlsx = require("xlsx")

async function generateJSON() {
	console.time("Gen")
   let files = await fs.promises.readdir(global.dataDir)

   let parsedCSV = await loadDataCSV()
   let csvJSON = parsedCSV.json

   function reclaimFiles(reclaimedFiles, ...fileNames) {
	   //Remove a file from files - it is associated with something.
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

   let namespacedCSVs = {}
   files.forEach((fileName) => {
	   //TODO: Right now, we only match animal codes and horizontal layouts.
	   //We'll need to support other matching systems, like DWI, as well as vertical layouts.

	   function processCSV(str, namespace) {
		   if (namespacedCSVs[namespace]) {
			   console.warn("Duplicate namespaces - overwriting ", namespace)
		   }

		   namespacedCSVs[namespace] = csvParse(str, {
				columns: function(header) {
					if (header[0].toLowerCase() === "animal") {
						header[0] = "Animal"
					}
					return header
				},
				columns_duplicates_to_array: true
			})
	   }

	   try {
		   let filePath = path.join(global.dataDir, fileName)
		   if (fileName.endsWith(".csv")) {
			   console.warn(fileName)
			   let str = fs.readFileSync(filePath)
			   processCSV(str, fileName.slice(0, -4))
		   }
		   else if (fileName.endsWith(".xlsx")) {
			   console.warn(fileName)
			   let file = xlsx.readFileSync(filePath)
			   console.log(file)
			   for (let sheetName in file.Sheets) {
				   let sheet = file.Sheets[sheetName]
				   //This is a bit ineffecient (double parsing), but it works for now.
				   let str = xlsx.utils.sheet_to_csv(sheet)
				   processCSV(str, fileName.slice(0, -5) + "/" + sheetName)
			   }
		   }
	   }
	   catch (e) {
		   console.error("Error processing namespace", fileName, e)
	   }
   })
	global.namespacedCSVs = namespacedCSVs
	//console.log(namespacedCSVs)


   for (let i=0;i<csvJSON.length;i++) {
	   let item = csvJSON[i]
	   item.type = "animal"
	   item.views = []
	   item.componentFiles = []

	   //These will be used for identification.
	   let animalCode = item.Animal, normalizedAnimalCode;

	   function normalizeCode(codeToNormalize = "") {
		   codeToNormalize = codeToNormalize.trim()
		   if (codeToNormalize.indexOf(":") !== -1) {
			   codeToNormalize = codeToNormalize.slice(0, codeToNormalize.indexOf(":"))
		   }
		   let fullyNormalized = codeToNormalize.split("-").join("_") //Some files have this normalized.

		   return {partiallyNormalized: codeToNormalize, fullyNormalized}
	   }

	   let tempVar = normalizeCode(animalCode)
	   animalCode = tempVar.partiallyNormalized
	   normalizedAnimalCode = tempVar.fullyNormalized


	   //Merge the namespacedCSVs into this animal.
	   //TODO: Support non-Animal property matching.
	   //TODO: What to do with DWI, GRE, and other properties? I assume we should merge those.
	   for (namespace in namespacedCSVs) {
		   let data = namespacedCSVs[namespace]

		   let matched = []
		   data.forEach((dataLine) => {
			   if (normalizeCode(dataLine.Animal).fullyNormalized === normalizedAnimalCode) {
				   matched.push(dataLine.Animal, normalizedAnimalCode)
				   for (let prop in dataLine) {
					   if (dataLine[prop] !== "" && prop !== "Animal") {
						   let nsProp = `${namespace}/${prop}`
						   if (item[nsProp]) {
							   //If this specific namespace has multiple entries for the same Animal, join them in an array.
							   //This is applicable for things like trials, where one animal is trialed multiple times.
							   if (!(item[nsProp] instanceof Array)) {
								   item[nsProp] = [item[nsProp]]
							   }
							   item[nsProp].push(dataLine[prop])
						   }
						   else {
							   item[nsProp] = dataLine[prop]
						   }
					   }
				   }
			   }
		   })
		   //console.warn(matched)
	   }



	   //These are all the different ways that files can be identified along with an animal.
	   //We keep them seperate so we can pair with labels better.
	   let provisionalItems = [animalCode, normalizedAnimalCode, item["SAMBA Brunno"], item.GRE, item.DWI].flat()

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
		   let stats = fs.statSync(path.join(global.dataDir, fileName))
		   return {
			   name: fileName,
			   size: stats.size,
			   lastModified: new Date(stats.mtime).getTime(),
			   type: "file"
		   }
	   })
   }


   let fileData = []
   files.forEach((fileName) => {
	   let stats = fs.statSync(path.join(global.dataDir, fileName))
	   fileData.push({
		   name: fileName,
		   size: stats.size,
		   lastModified: new Date(stats.mtime).getTime(),
		   type: "file"
	   })
   })

   let allData = csvJSON.concat(fileData)

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
	   csvSources: {
		   "Mice": parsedCSV.csvText
	   },
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
