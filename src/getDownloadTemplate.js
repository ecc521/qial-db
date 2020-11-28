module.exports = function(urls) {
	return `//This file will fill the current working directory.
const readline = require("readline").createInterface({
	input: process.stdin,
	output: process.stdout
})

const http = require("http")
const fs = require("fs")
const path = require("path")

let directory = path.resolve(".")
console.log("The default directory is " + directory)

let progressPath;

function downloadFile(url) {
	let filename = url.slice(url.lastIndexOf("/") + 1)
	let outputPath = path.join(directory, filename)

	if (fs.existsSync(outputPath)) {
		console.log("Already Exists - Skipping " + filename)
		return;
	}

	return new Promise((resolve, reject) => {
		let file = fs.createWriteStream(progressPath)
		http.get(url, (response) => {
			response.pipe(file)
			file.on("finish", () => {
				file.close(() => {
					fs.renameSync(progressPath, outputPath)
					resolve()
				})
			})
		})
	})
}


async function run(urls) {
	await new Promise((resolve) => {
		let relativePath = readline.question("If you would like to use a subdirectory of this, please enter the relative path: ", (relativePath) => {
			directory = path.join(directory, relativePath)
			if (!fs.existsSync(directory)) {
				fs.mkdirSync(directory, {recursive: true})
			}
			console.log("Using " + directory)
			resolve()
		})
	})

	progressPath = path.join(directory, "qial-inprogress")

	if (fs.existsSync(progressPath)) {
		console.log("Deleting old progress file. ")
		fs.unlinkSync(progressPath)
	}

	for (let i=0;i<urls.length;i++) {
		let url = urls[i]
		console.log("Starting download of " + url)
		await downloadFile(url)
	}
	console.log("Done with Downloads. ")
	readline.question("Type 'y' if you would like to delete this file. ", (selection) => {
		if (selection.trim() === "y") {
			console.log("Deleting...")
			fs.unlinkSync(__filename)
			console.log("Ending Program...")
			process.kill(process.pid) //TODO: This doesn't look right... Is this the command or is something not getting cleaned up?
		}
	})
}

//Call run with the array of URLs.
run(${JSON.stringify(urls)})`
}
