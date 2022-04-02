import fs from "fs";
import path from "path";
import webpack from "webpack";

import {runDev, runProd, watchDev} from "./webpackbuild.js"


//See https://github.com/plotly/plotly.js/blob/master/dist/README.md#partial-bundles
//File size is greatly reduced by using a partial bundle. This one supports violn plots.
console.log("Copying plotly...")

let plotlyBundlePath = "./node_modules/plotly.js-dist-min/plotly.min.js"
let outputPlotlyPath = "dist/plotly.js"

let plotlyBundleBuffer = fs.readFileSync(plotlyBundlePath)

let outputPlotlyBuffer;
if (fs.existsSync(outputPlotlyPath)) {
	outputPlotlyBuffer = fs.readFileSync(outputPlotlyPath)
}

if (outputPlotlyBuffer && plotlyBundleBuffer.equals(outputPlotlyBuffer)) {
	console.log("Plotly already present and up to date")
}
else {
	if (!fs.existsSync("dist")) {fs.mkdirSync("dist")}
	fs.writeFileSync(outputPlotlyPath, plotlyBundleBuffer)
	console.log("Copied Plotly")
}




if (process.argv.includes("watch")) {
	watchDev()
}
else if (process.argv.includes("prod")) {
	runProd()
}
else {
	console.log(`Must pass either "watch" or "prod" as argument. `)
}
