const path = require("path")
const fs = require("fs")

const FtpSrv = require('ftp-srv');

//Port 21 requires superuser!
//TODO: This is read only and publically available, but we should still encrypt downloads.
const url = "0.0.0.0"
const port = "21"

global.dataDir = path.join(__dirname, "data")
fs.mkdirSync(global.dataDir, {recursive: true})

const ftpServer = new FtpSrv({
	url: `ftp://${url}:${port}`,
	pasv_url: `ftp://${url}:${port}`,
	pasv_min: 50000,

	//Make read only.
	//Really wish there was a simple config, as more commands might appear in the future.
	//https://github.com/autovance/ftp-srv/blob/master/bin/index.js#L105-L107
	blacklist: ['ALLO', 'APPE', 'DELE', 'MKD', 'RMD', 'RNRF', 'RNTO', 'STOR', 'STRU'],
});

ftpServer.on('login', ({connection, username, password}, resolve, reject) => {
	//Anonymous, username and password do not matter. Assume valid.
	resolve({
		root: global.dataDir,
	})
});

ftpServer.listen()
.then(() => {
	console.log("Listening")
});
