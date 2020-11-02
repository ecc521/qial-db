const fs = require("fs")
const path = require("path")
const child_process = require("child_process")

const loadDataCSV = require("./loadDataCSV.js")
const dataDir = path.join(__dirname, "../", "data")

async function generateThumbnails(pathToNIFTI) {
	//Generate thumbnails.

	let outputName = path.basename(pathToNIFTI)
	let outputNameRoot = outputName.slice(0, outputName.indexOf("."))
	let outputNames = [
		outputNameRoot + ".qialdbthumbnail.x.png",
		outputNameRoot + ".qialdbthumbnail.y.png",
		outputNameRoot + ".qialdbthumbnail.z.png"
	]

	//We're going to assume that, if the file is already there, it is correct.
	if (outputNames.every((outputName) => {
		return fs.existsSync(path.join(dataDir, outputName))
	})) {
		return outputNames //Short circuit - save fs writes and time.
	}

	let process = child_process.spawn("python3", [
		path.join(__dirname, "generateThumbnails.py"),
		pathToNIFTI,
	].concat(outputNames), {
		cwd: dataDir
	})

	await new Promise((resolve, reject) => {
		process.on('close', resolve);
	})

	return outputNames
}

module.exports = async function() {

	let files = await fs.promises.readdir(dataDir)

	let csvJSON = await loadDataCSV()

	function reclaimFiles(...fileNames) {
		//Remove a file from files - it is associated with something.
		fileNames.forEach((fileName) => {
			if (fileName instanceof Array) {reclaimFiles(...fileName)}
			else {
				let index = files.indexOf(fileName)
				if (index !== -1) {
					files.splice(index, 1)
				}
			}
		})
	}

	for (let i=0;i<csvJSON.length;i++) {
		let item = csvJSON[i]
		item.type = "animal"
		item.views = []

		if (item["SAMBA Brunno"]) {
			let view = {
				name: "SAMBA Brunno",
				filePath: item["SAMBA Brunno"] + "_T1_masked.nii.gz",
				labelPath: item["SAMBA Brunno"] + "_invivoAPOE1_labels.nii.gz",
			}
			view.thumbnails = await generateThumbnails(view.filePath)
			item.views.push(view)
			reclaimFiles(view.filePath, view.labelPath, view.thumbnails)
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
				view.thumbnails = await generateThumbnails(view.filePath)
				item.views.push(view)
				reclaimFiles(view.filePath, view.thumbnails)
			}
		}
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
