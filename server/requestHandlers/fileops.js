/**
 * @overview Handles requests to rename and delete files.
 */


 import {checkAuth} from "../utils/auth.js";

 /**
  * Handles requests to rename and delete files.
  * @param {Object} req - Express request object.
  * @param {Object} res - Express response object.
  */

async function fileopHandler(req, res) {
     await checkAuth(req, res, {write: true})

     let filename = req.headers['qial-filename']

 	let filePath = path.join(global.dataDir, filename)
     assureRelativePathSafe(filename)

     if (!fs.existsSync(filePath)) {
         res.statusCode = 400
         res.setHeader('Content-Type', 'text/plain');
         res.end("File does not exist. ");
         return;
     }

     if (fs.lstatSync(filePath).isDirectory()) {
         res.statusCode = 401
         res.setHeader('Content-Type', 'text/plain');
         res.end("Modifying directories is prohibited. ");
         return;
     }

 	res.statusCode = 200
 	res.setHeader('Content-Type', 'text/plain');

 	if (req.method === "DELETE") {
 		await fs.promises.unlink(filePath)
 		//TODO: This can throw if filePath doesn't exist.
 		res.end(`${path.basename(filePath)} deleted. Changes should appear shortly. `);
 	}
 	else if (req.method === "PATCH") {
 		let targetFileName = req.headers['qial-target-filename']
 		let targetFilePath = path.join(global.dataDir, targetFileName)
         assureRelativePathSafe(targetFileName)

 		//TODO: This can throw if it doesn't exist.
 		await fs.promises.rename(filePath, targetFilePath)
 		res.end(`${path.basename(filePath)} renamed to ${path.basename(targetFilePath)}. Changes should appear shortly. `);
 	}
 	return
 }

 export default fileopHandler
