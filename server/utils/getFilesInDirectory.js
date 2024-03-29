import fs from "fs";
import path from "path";

/**
 * Recursively obtains files in a directory.
 * @param {string} dir - Path of directory.
 * @param {string[]} [files=[]] - Files to concatenate with result. 
 */
async function getFilesInDirectory(dir, files = []) {
	let items = await fs.promises.readdir(dir)

	let promises = []
	items.forEach((name) => {
		let promise = (async function() {
			let src = path.join(dir, name)
			let stats = await fs.promises.stat(src)
			if (stats.isDirectory()) {
				await getFilesInDirectory(src, files)
			}
			else {
				files.push(src)
			}
		}())
		promises.push(promise)
	})

	await Promise.allSettled(promises)
	return files
}

export default getFilesInDirectory
