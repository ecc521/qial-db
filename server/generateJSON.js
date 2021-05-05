const fs = require("fs")
const path = require("path")

const loadDataCSV = require("./loadDataCSV.js")

const generateThumbnails = require("./generateThumbnails.js")

async function generateJSON() {
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


   let niiFiles = files.filter((fileName) => {
	   return fileName.endsWith(".nii") || fileName.endsWith(".nii.gz")
   })


   for (let i=0;i<csvJSON.length;i++) {
	   let item = csvJSON[i]
	   item.type = "animal"
	   item.views = []
	   item.componentFiles = []

	   //These will be used for identification.
	   let normalizedAnimalCode = item.Animal.split("-").join("_")
	   if (normalizedAnimalCode.indexOf(":") !== -1) {
		   normalizedAnimalCode = normalizedAnimalCode.slice(0, normalizedAnimalCode.indexOf(":"))
	   }

	   let provisionalItems = [normalizedAnimalCode, item["SAMBA Brunno"], item.GRE, item.DWI]
	   let itemsToCheck = []

	   //Expand arrays of identifying codes, in case there are multiple (like with Animal 190610-1:1, which has multiple GRE and DWI identifiers)
	   //Also filter out blank identifiers, for empty boxes.
	   for (let i=0;i<provisionalItems.length;i++) {
		   let item = provisionalItems[i]
		   if (item instanceof Array) {
			   item.forEach((subitem) => {
				   provisionalItems.push(subitem)
			   })
		   }
		   else if (item) {
			   itemsToCheck.push(item)
		   }
	   }

	   //TODO: Probably use a dictionary. If the same identifier is used by both labels and normal files, assume there are labels.
	   //We should also move our thumbnails to use a directory for each item - probably a better arrangment to have the data and the computed cache items seperated.

	   let relatedFiles = niiFiles.filter((fileName) => {
		   return itemsToCheck.some((item) => {
			   return fileName.includes(item)
		   })
	   })

	   //TODO: Handle labels. Probably search filename for word label.
	   for (let i=0;i<relatedFiles.length;i++) {
		   let fileName = relatedFiles[i]
		   let view = {
			   name: fileName,
			   filePath: fileName,
			   //labelPath: item["SAMBA Brunno"] + "_invivoAPOE1_labels.nii.gz",
		   }

		   view.thumbnails = await generateThumbnails(path.join(global.dataDir, view.filePath)) //Generate the thumbnails files into cache.
		   item.views.push(view)
		   item.componentFiles = item.componentFiles.concat(reclaimFiles([], view.filePath)) //view.labelPath
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

   return {
	   csvSources: {
		   "Mice": parsedCSV.csvText
	   },
	   data: allData
   }
}

let openRequest;
module.exports = async function() {
	//Don't run this multiple times at once. If an outstanding request is open, return it for any new requests as well.
	//generateJSON may crash if it is run multiple times at once, or generate invalid thumbnails, etc.
	if (openRequest) {
		return await openRequest
	}

	try {
		openRequest = generateJSON()
		return await openRequest
	}
	finally {
		openRequest = null;
	}
}
