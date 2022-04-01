import * as path from "path";
import webpack from "webpack";

let config = {
	mode: "production", //Build for production
	entry: {
		index: "./src/index.js",
	},
	target: "web",
	devtool: "source-map",
	optimization: {
		minimize: false,
	},
	stats: {
		colors: true
	},
	cache: {
	  type: 'memory',
	  cacheUnaffected: true,
	},
	experiments: {
	  topLevelAwait: true,
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
						presets: [
							[
								'@babel/preset-env', {
								useBuiltIns: 'usage',
								"corejs": {
									"version": 3,
									"proposals": true
								}
							}]
						],
					}
				}
			}
		]
	}
}

let compiler = webpack(config);
config.optimization.minimize = true
let minimizingCompiler = webpack(config);

function compilerCallback(err, stats) {
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
}


function run(compilerToRun) {
	return new Promise((resolve, reject) => {
		compilerToRun.run(function(...args) {
			compilerCallback(...args)
			compilerToRun.close((closeErr) => {
				if (closeErr === null) {resolve()}
				reject(closeErr)
			});
		})
	})
}

function runProd() {return run(minimizingCompiler)}
function runDev() {return run(compiler)}

function watchDev() {
	compiler.watch({
		aggregateTimeout: 100,
		ignored: /node_modules/
	}, compilerCallback)
}

export {runProd, runDev, watchDev}
