/**
 * @overview Handles requests to download files.
 */

 /**
  * Handles requests to download files.
  * @param {Object} req - Express request object.
  * @param {Object} res - Express response object.
  */
async function downloadHandler(req, res) {
	 let data = req.body
     let names = data.names.split(",")

 	for (let i=0;i<names.length;i++) {
         assureRelativePathSafe(names[i])
 	}

 	//Send the user a zip file.
 	//Most of our files are already compressed, but not all.
 	//We'll use compression level 6 here, which is default. Might need to revert this back if it's too slow/cpu heavy.
 	//That said, the NodeJS download script is far better for big downloads, and GZIP will be used on all files,
 	//except those that are uncompressable (like already gzipped files)
 	let zipper = child_process.spawn("zip", ["-6", "-"].concat(names), {
 		cwd: global.dataDir,
 		stido: ["ignore", "pipe", "pipe"] //Ingore stdin. Pipe others.
 	})

 	res.statusCode = 200;
 	res.setHeader('Content-Type', 'application/zip');
 	zipper.stdout.pipe(res) //Respond with the zip file.
 	return;
 }


export default downloadHandler
