/**
 * @overview Initializes filesystem then calls main server code.
 */

import path from "path";
import fs from "fs";

//Initialize directory paths.
global.rootDir = path.dirname((new URL(import.meta.url)).pathname)
global.dataDir = path.join(global.rootDir, "data")
global.tmpDir = path.join(global.dataDir, "tmp")
global.studiesDir = path.join(global.dataDir, "studies")

//Ensure directories are created if necessary
fs.mkdirSync(global.dataDir, {recursive: true})
fs.rmSync(global.tmpDir, {force: true, recursive: true}) //Delete the old tmp directory, if it exists.
fs.mkdirSync(global.studiesDir, {recursive: true})

//Start the server.
import("./server/index.js") //Async import so the global variables are available.
