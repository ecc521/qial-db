const fetch = require("node-fetch")
const crypto = require("crypto")

async function fetchAuthFile(AUTH_FILE_ID = "1h0dFgl7Q7SaK8jOLzf0H1hqS7asZnhPsEMAEQTMstpQ", API_KEY = "AIzaSyCNyaZX81DId62wp_UOS2mncJq-1YQdJmM") {
	let request = await fetch('https://www.googleapis.com/drive/v3/files/' + AUTH_FILE_ID + '/export?mimeType=' + "text/plain" + '&key=' + API_KEY)
	let body = await request.text()

	//Format:
	//Each hash and salt entry is on a new line. The salt comes first, then the hash. There is no space between the two.
	//All lines that do not start with exactly 128 hexadecimal characters, after whitespace is removed, will be ignored, to allow for easy commenting and labeling.
	//Since there are no usernames, every password submitted must be tested against every available salt-hash combo.

	//Permissions are indicated by y, for yes, or n, for no. They go right at the end of the hexadecimal string.
	//Current permissions are "upload", "rename", and "delete", in that order.

	let lines = body.split("\n")
	lines = lines.map((line) => {return line.trim()})
	let regexpHex = /[0-9A-Fa-f]{6}/g
	lines = lines.filter((line) => {
		if (line.length >= 128 && regexpHex.test(line.slice(0,128))) {return true}
	})

	let combos = lines.map((line) => {
		let permissions = [true, true, false] //Default - No permissions.

		line.slice(128).split("").forEach((char, index) => {
			if (char === "y") {
				permissions[index] = true
			}
			else if (char === "n") {
				permissions[index] = false
			}
		})

		return {
			"salt": line.slice(0,64),
			"hash": line.slice(64, 128),
			"permissions": permissions
		}
	})

	return combos
}


let combos; //We will use the result of the previous request, unless that would result in denial, in which case we try again.

//TODO: Take permissions needed as arg, and download file again if not met. We can also search through all passwords for one with the needed permissions then,
//in case the same password happens to be added twice with different permissions.
async function authPassword(password, permissions = [], useCache = true) {
	//Determine if this password is valid.
	if (!combos || !useCache) {
		combos = await fetchAuthFile()
		useCache = false //We didn't cache, so if it isn't valid, don't try again.
	}

	//There may be multiple combos generated off of the same password, especally if somebody puts something in twice.
	//Check all because of permissions.
	validCombos = combos.filter((piece) => {
		//Hash the salt and the provided password
		let hash = getHash(piece.salt, password)
		//If the hash matches the auth hash, valid.
		if (hash === piece.hash) {
			return true
		}
	})

	let obj = {
		valid: validCombos.length,
		permissions: [false, false, false],
		authorized: true
	}

	validCombos.forEach((combo) => {
		combo.permissions.forEach((permission, index) => {
			obj.permissions[index] = obj.permissions[index] || permission
		});
	});

	permissions.forEach((item, i) => {
		if (item === true && obj.permissions[i] !== true) {
			obj.authorized = false
		}
	});

	if (!obj.valid) {obj.message = "Invalid Password"}
	else if (!obj.authorized) {
		obj.message = "Insuffecient Permissions: Has " + obj.permissions.map((perm) => {return perm?"y":"n"}).join("") + ", but needs " + permissions.map((perm) => {return perm?"y":"n"}).join("") + " or more. "
	}

	//If not authorized, but we used cache, retry not caching.
	if (!obj.authorized && useCache) {
		return await authPassword(password, permissions, false)
	}

	return obj
}


function getHash(salt, password) {
	return crypto.createHash("sha256").update(salt + password).digest("hex")
}

//Return a proper entry for this password.
function generateEntry(password) {
	let salt = crypto.randomBytes(32).toString("hex")
	return salt + getHash(salt, password)
}

module.exports = {
	getHash,
	generateEntry,
	authPassword,
	fetchAuthFile //For testing purposes.
}
