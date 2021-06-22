const webpack = require('webpack');
const fs = require("fs") //For plotly copy

//Non-minified build is much faster, but accidental commits with it are possible. We'll build both.

let config = {
	mode: "production", //Build for production
	entry: {
		"packages/index.js": "./src/index.js",
	},
	target: "web",
	devtool: "source-map",
	output: {
		path: __dirname,
		filename: "[name]",
	},
	optimization: {
		minimize: false //Consider using Uglify.js for minification.
		//https://github.com/mishoo/UglifyJS2/blob/ae67a4985073dcdaa2788c86e576202923514e0d/README.md#uglify-fast-minify-mode
	},
	stats: {
		colors: true
	},
	module: {
		rules: [
			{
				test: /\.js$/,
				exclude: /node_modules/,
				use: {
					loader: 'babel-loader',
					options: {
						cacheDirectory: true, //Huge performance boost. Avoid recompiling when unneeded.
						cacheCompression: true, //true is default. Compress cached data written to disk.
						sourceType: 'unambiguous', //Allow mixing CommonJS and ES6 modules.
						presets: [
							[
								'@babel/preset-env', {
								useBuiltIns: 'usage',
								corejs: "3.3.6"
							}]
						],
						"plugins": [
							"@babel/plugin-proposal-class-properties"
						]
					}
				}
			}
		]
	}
}

let compiler = webpack(config);
config.optimization.minimize = true
let minimizingCompiler = webpack(config);



compiler.watch({
	aggregateTimeout: 100,
	ignored: /node_modules/
}, (err, stats) => {
  if (err) {
	console.error(err.stack || err);
	if (err.details) {
	  console.error(err.details);
	}
	return;
  }

  const info = stats.toJson();

  if (stats.hasErrors()) {
	console.error(info.errors.join(""));
  }

  if (stats.hasWarnings()) {
	console.warn(info.warnings.join(""));
  }

  // Log result...
	console.log(
		stats.toString({
		  chunks: false,  // Makes the build much quieter
		  colors: true  // Add console colors
		})
	);


	//See https://github.com/plotly/plotly.js/blob/master/dist/README.md#partial-bundles
	//File size is greatly reduced by using a partial bundle. This one supports violn plots.
	console.log("Copying plotly...")

	let plotlyBundlePath = "./node_modules/plotly.js-cartesian-dist-min/plotly-cartesian.min.js"
	let outputPlotlyPath = "packages/plotly.js"

	let plotlyBundleBuffer = fs.readFileSync(plotlyBundlePath)

	let outputPlotlyBuffer;
	if (fs.existsSync(outputPlotlyPath)) {
		outputPlotlyBuffer = fs.readFileSync(outputPlotlyPath)
	}

	if (outputPlotlyBuffer && plotlyBundleBuffer.equals(outputPlotlyBuffer)) {
		console.log("Plotly already present and up to date")
	}
	else {
		if (!fs.existsSync("packages")) {fs.mkdirSync("packages")}
		fs.writeFileSync(outputPlotlyPath, plotlyBundleBuffer)
		console.log("Copied Plotly")
	}


	console.log("Running minimized build\n")

	minimizingCompiler.run((err, stats) => {
	  if (err) {
		console.error(err.stack || err);
		if (err.details) {
		  console.error(err.details);
		}
		return;
	  }

	  const info = stats.toJson();

	  if (stats.hasErrors()) {
		console.error(info.errors.join(""));
	  }

	  if (stats.hasWarnings()) {
		console.warn(info.warnings.join(""));
	  }

	  // Log result...
		console.log(
			stats.toString({
			  chunks: false,  // Makes the build much quieter
			  colors: true  // Add console colors
			})
		);
	})
})
