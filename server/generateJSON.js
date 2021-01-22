const fs = require("fs")
const path = require("path")
const child_process = require("child_process")
const os = require("os")
const zlib = require("zlib")

const loadDataCSV = require("./loadDataCSV.js")
const dataDir = path.join(__dirname, "../", "data")

async function generateThumbnails(pathToNIFTI) {
	//Generate thumbnails.

	let outputName = path.basename(pathToNIFTI)
	let outputNameRoot = outputName.slice(0, outputName.indexOf("."))
	let type = "jpg" //JPEG is ~3x smaller, and similar visual quality. These are thumbnails.
	let outputNames = [
		outputNameRoot + ".qialdbthumbnail.x." + type,
		outputNameRoot + ".qialdbthumbnail.y." + type,
		outputNameRoot + ".qialdbthumbnail.z." + type
	]

	//If we don't need to generate any images, then don't generate any.
	let modifiedNifti = fs.statSync(pathToNIFTI).mtime
	if (
		outputNames.every((fileName) => {
			let filePath = path.join(dataDir, fileName)
			if (!fs.existsSync(filePath)) {return false} //Need to regenerate. Doesn't exist.
			let modified = fs.statSync(filePath).mtime
			if (modified < modifiedNifti) {return false} //Nifti modified more recently than thumbnail. Thumbnail old.
			return true
		})
	) {
		return outputNames
	}



	//Currently, generateThumbnails.py requires the entire decompressed file to generate thumbnails,
	//however can read portions off disk just fine it appears.
	//It currently runs out of memory on some systems with larger files, but is fine when the decompressed file is used from disk.
	//Therefore, decompress large files to disk on systems with little memory.

	//This should clean up stuff the next run even if broken GZIP files are left around once. May have one load with extra files.
	let tempPath;
	if (pathToNIFTI.endsWith(".nii.gz")) {
		console.log("nii.gz!")
		if (fs.statSync(pathToNIFTI).size > os.freemem() / 6) {
			console.log("Low Mem!")
			tempPath = pathToNIFTI.slice(0, -3)
			let unzipper = zlib.createGunzip()
			await new Promise((resolve, reject) => {
				let stream = fs.createReadStream(pathToNIFTI)
				let dest = fs.createWriteStream(tempPath)
				let writeStream = stream.pipe(unzipper).pipe(dest)
				writeStream.on("finish", resolve)
			})
		}
	}

	try {
		let process = child_process.spawn("python3", [
			path.join(__dirname, "generateThumbnails.py"),
			tempPath || pathToNIFTI,
		].concat(outputNames), {
			cwd: dataDir
		})

		await new Promise((resolve, reject) => {
			process.on('close', resolve);
		})

		return outputNames
	}
	finally {
		if (tempPath && fs.existsSync(tempPath)) {
			fs.unlinkSync(tempPath)
		}
	}
}

module.exports = async function() {
	let files = await fs.promises.readdir(dataDir)

	let csvJSON = await loadDataCSV()

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

			view.thumbnails = await generateThumbnails(path.join(dataDir, view.filePath))
			item.views.push(view)
			item.componentFiles = item.componentFiles.concat(reclaimFiles([], view.filePath, view.thumbnails)) //view.labelPath

		}


		/*if (item["SAMBA Brunno"]) {
			let view = {
				name: "SAMBA Brunno",
				filePath: item["SAMBA Brunno"] + "_T1_masked.nii.gz",
				labelPath: item["SAMBA Brunno"] + "_invivoAPOE1_labels.nii.gz",
			}

			let filePath = path.join(dataDir, view.filePath)
			if (fs.existsSync(filePath)) {
				view.thumbnails = await generateThumbnails(filePath)
				if (!fs.existsSync(path.join(dataDir, view.labelPath))) {
					delete item.labelPath
				}
				item.views.push(view)
				item.componentFiles = item.componentFiles.concat(reclaimFiles([], view.filePath, view.labelPath, view.thumbnails))
			}
		}
		delete item["SAMBA Brunno"]

		let prefix = "Animal_" + item.Animal.split("-").join("_")
		if (prefix.indexOf(":") !== -1) {
			prefix = prefix.slice(0, prefix.indexOf(":"))
		}
		let relatedFiles = files.filter((fileName) => {
			if (fileName.indexOf(prefix) === 0) {return true}
		})

		for (let i =0;i<relatedFiles.length;i++) {
			let fileName = relatedFiles[i]
			if (fileName.endsWith(".nii") || fileName.endsWith(".nii.gz")) {
				let view = {
					name: fileName.slice(fileName.indexOf("RARE_MEMRI"), fileName.indexOf(".")),
					filePath: fileName,
				}

				let filePath = path.join(dataDir, view.filePath)
				if (fs.existsSync(filePath)) {
					view.thumbnails = await generateThumbnails(filePath)
					item.views.push(view)
					item.componentFiles = item.componentFiles.concat(reclaimFiles([], view.filePath, view.thumbnails))
				}
			}
		}*/





		item.componentFiles = item.componentFiles.map((fileName) => {
			let stats = fs.statSync(path.join(dataDir, fileName))
			return {
				name: fileName,
				size: stats.size,
				lastModified: new Date(stats.mtime).getTime(),
				type: "file"
			}
		})
		//Cleaning up and keeping thumbnails up to date is handled elsewhere.
		item.componentFiles = item.componentFiles.filter((obj) => {
			if (!obj.name.includes(".qialdbthumbnail.")) {return true}
			return false
		})
	}

	//Delete all thumbnails without associated animals.
	files = files.filter((fileName) => {
		if (!fileName.includes(".qialdbthumbnail.")) {return true}
		fs.unlinkSync(path.join(dataDir, fileName))
		return false
	})


	let fileData = []
	files.forEach((fileName) => {
		let stats = fs.statSync(path.join(dataDir, fileName))
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

	return allData
}
