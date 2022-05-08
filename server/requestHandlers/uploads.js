/**
 * @overview Handles requests to upload files.
 */


 import {checkAuth} from "../utils/auth.js";

 /**
  * Handles a request to upload a file.
  * @param {Object} req - Express request object.
  * @param {Object} res - Express response object.
  */

 async function uploadHandler(req, res) {
	await checkAuth(req, res, {add: true})

 	let filename = req.headers['qial-filename']

 	//Now we can process the actual upload. The user is authorized.
 	let action = req.headers["qial-action"]

     let writePath = path.join(global.dataDir, filename) //Final destination.
     assureRelativePathSafe(filename)

     //Don't allow overwriting files - error.
     if (fs.existsSync(writePath)) {
         res.statusCode = 400
         res.setHeader('Content-Type', 'text/plain');
         res.end("Uploads may not overwrite a file. Please pick a different name, or delete/move the file. ");
         return;
     }

     //Allocate a temporary directory based of a users UID.
     //These temporary directories are user specific, which should prevent others from modifying them.
     //Note that two people can technically upload the same file at once - so we must verify before we move.
     console.log(req.session.user)
     let userTempDirectory = path.join(global.tmpDir, req.session.user.uid)
     if (!fs.existsSync(userTempDirectory)) {fs.mkdirSync(userTempDirectory, {recursive: true})}

     //Determine write path for this file.
     let tempPath = path.join(userTempDirectory, filename)

     let writeStream;

     if (action === "create") {
         if (tempPath && fs.existsSync(tempPath)) {
             //Delete the existing file. Probably a reupload after previous attempt failed.
             fs.unlinkSync(tempPath)
         }

         //We will check the temporary file every 15 minutes. If it hasn't changed, it will be deleted.
         let pulseDuration = 1000 * 60 * 15

         let interval = setInterval(function() {
             if (Date.now() - fs.statSync(tempPath).mtime > pulseDuration) {
                 fs.promises.rm(tempPath)
                 clearInterval(interval)
             }
         }, pulseDuration)

         writeStream = fs.createWriteStream(tempPath, {
 			flags: "w"
 		})
     }
     else if (action === "append") {
         if (!tempPath) {
             res.statusCode = 400
             res.setHeader('Content-Type', 'text/plain');
             res.end("No upload in progress. You may have timed out. ");
             return;
         }

         writeStream = fs.createWriteStream(tempPath, {
 			flags: "a"
 		})
     }


     let closePromise = new Promise((resolve, reject) => {
         writeStream.on("finish", resolve)
         writeStream.on("error", reject)
     })

     req.pipe(writeStream)

     let last = (req.headers["qial-last"] === "last")
     if (last) {
         await closePromise

         if (fs.existsSync(writePath)) {
             res.statusCode = 400
             res.setHeader('Content-Type', 'text/plain');
             res.end("Unable to transfer file - destination occupied. A file may have been added or moved during your upload. ");
             return;
         }

         fs.renameSync(tempPath, writePath)
     }

 	res.statusCode = 200
 	res.setHeader('Content-Type', 'text/plain');
 	res.end("Success");
 	return
 }

export default uploadHandler
