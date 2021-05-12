const fs = require("fs")
const path = require("path")

const loadDataCSV = require("./loadDataCSV.js")

const generateThumbnails = require("./generateThumbnails.js")
const createPrecomputed = require("./createPrecomputed.js")
const generateTiffThumbnails = require("./generateTiffThumbnails.js")

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


   for (let i=0;i<csvJSON.length;i++) {
	   let item = csvJSON[i]
	   item.type = "animal"
	   item.views = []
	   item.componentFiles = []

	   //These will be used for identification.
	   let animalCode = item.Animal, normalizedAnimalCode;
	   if (animalCode.indexOf(":") !== -1) {
		   animalCode = animalCode.slice(0, animalCode.indexOf(":"))
	   }
	   normalizedAnimalCode = animalCode.split("-").join("_") //Some files have this normalized.

	   //These are all the different ways that files can be identified along with an animal.
	   //We keep them seperate so we can pair with labels better.
	   let provisionalItems = [animalCode, normalizedAnimalCode, item["SAMBA Brunno"], item.GRE, item.DWI]

	   let relatedFiles = provisionalItems.map((itemsToCheck) => {
		   //Some animals, like with Animal 190610-1:1, can have multiple GRE and DWI identifiers - we need to allow for arrays or single values.
		   if (!(itemsToCheck instanceof Array)) {itemsToCheck = [itemsToCheck]}
		   itemsToCheck = itemsToCheck.filter(item => item) //Filter out blank identifiers, for empty boxes.

		   return files.filter((fileName) => {
			   return itemsToCheck.some((item) => {
				   return fileName.includes(item)
			   })
		   })
	   })

	   //Each batch is all the files that matched with a specific identifier.
	   //TODO: What if the two different identifiers match the same file?
	   for (let i=0;i<relatedFiles.length;i++) {
		   let filesInBatch = relatedFiles[i]
		   item.componentFiles.push(...reclaimFiles([], ...filesInBatch)) //All related files are components, even if they aren't in a view.

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
