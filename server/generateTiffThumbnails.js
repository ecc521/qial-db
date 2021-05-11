const fs = require("fs")
const path = require("path")

const sharp = require("sharp")

async function generateTiffThumbnails(pathToFile) {
	//Generate thumbnails.
	let outputName = path.basename(pathToFile)

	let finalType = "webp"
	let views = ["x","y","z"]
	let outputNames = views.map((view) => {
		return outputName + `.${view}.${finalType}`
	})

	//If we don't need to generate any images (already cached), then don't generate any.
	let modifiedFile = fs.statSync(pathToFile).mtime
	if (
		outputNames.every((fileName) => {
			let filePath = path.join(global.thumbnailsDir, fileName)
			if (!fs.existsSync(filePath)) {return false} //Need to regenerate. Doesn't exist.
			let modified = fs.statSync(filePath).mtime
			if (modified < modifiedFile) {return false} //File modified more recently than thumbnail. Thumbnail old.
			return true
		})
	) {
		return outputNames
	}

	let metadata = await sharp(pathToFile).metadata()

	//I believe I have these axes correct - they might be misordered.
	//TODO: Test where all 3 dimensions are different.
	let xViewConfig = {
	  width: metadata.pages,
	  height: metadata.height, //Check
	  channels: 3,
	  background: { r: 0, g: 0, b: 0}
	}

	let yViewConfig = {
	  width: metadata.pages,
	  height: metadata.height, //Check
	  channels: 3,
	  background: { r: 0, g: 0, b: 0}
	}

	let xViewBuff = Buffer.alloc(xViewConfig.width * xViewConfig.height * xViewConfig.channels)
	let yViewBuff = Buffer.alloc(yViewConfig.width * yViewConfig.height * yViewConfig.channels)

	for (let i=0;i<metadata.pages;i++) {
		//Take the center slice out of this. We'll do it vertically this time.
		let buff = await sharp("data/210301-5_Material_Decomposition.tif", {page: i}).raw().toBuffer()

		let xSlice = Math.round(xViewConfig.height/2) - 1
		let ySlice = Math.round(yViewConfig.height/2) - 1

		//TODO: We really don't need to iterate every pixel. This is slow. We can use offsets and skip some.
		for (let x=0;x<xViewConfig.width;x++) {
			for (let y=0;y<xViewConfig.height;y++) {
				let pos = xViewConfig.channels * (x + y * metadata.width)

				if (x === xSlice) {
					//console.log(x, y)
					//Column number is i. Row number is y.
					let buffPos = xViewConfig.channels * (i + y * xViewConfig.width)
					for (let offset=0;offset<xViewConfig.channels;offset++) {
						xViewBuff[buffPos + offset] = buff[pos + offset]
					}
				}
				if (y === ySlice) {
					let buffPos = yViewConfig.channels * (i + x * yViewConfig.width)
					for (let offset=0;offset<yViewConfig.channels;offset++) {
						yViewBuff[buffPos + offset] = buff[pos + offset]
					}
				}
			}
		}
	}

	let slices = [
		await sharp(xViewBuff, {raw: xViewConfig}),
		await sharp(yViewBuff, {raw: yViewConfig}),
		await sharp(pathToFile, {page: Math.round(metadata.pages / 2) - 1}).rotate(270).flip()
	]

	for (let i=0;i<slices.length;i++) {
		let slice = slices[i]
		await slice.resize({height: 180})
			.webp({
				reductionEffort: 6, //Could be slow. 0-6 for CPU used to compress. Default 4
				quality: 80, //Default 80.
			})
			.toFile(path.join(global.thumbnailsDir, outputNames[i]))
	}

	return outputNames
}


module.exports = generateTiffThumbnails
