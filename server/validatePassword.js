const fetch = require("node-fetch")
const crypto = require("crypto")

async function fetchAuthFile() {
	let request = await fetch("https://api.github.com/repos/ecc521/qial-db/releases/latest")
	let response = await request.json()
	let body = response.body //This is the description of the latest release.

	/*
In order to generate a new hash/salt combo,

Note: These hashes and salts are exposed to the public. Therefore is strongly advised to use a password not related to those you use elsewhere. We should probably hash more than once, and use a more expensive hashing function to make guessing more costly, however this implementation should be solid, provided passwords are non-trivial.

Format:
Each hash and salt entry is on a new line. The salt comes first, then the hash. There is no space between the two.
All lines not exactly 128 hexadecimal characters, after whitespace is removed, will be ignored. These lines can be used for comments and labeling.
Since there are no usernames, every password submitted must be tested against every available salt-hash combo.
	*/
	let lines = body.split("\n")
	lines = lines.map((line) => {return line.trim()})
	let regexpHex = /[0-9A-Fa-f]{6}/g
	lines = lines.filter((line) => {
		if (line.length === 128 && regexpHex.test(line)) {return true}
	})

	console.log(lines)

	let pieces = lines.map((line) => {
		return {
			"salt": line.slice(0,64),
			"hash": line.slice(64, 128)
		}
	})
}


let pieces; //We will use the result of the previous request, unless that would result in denial, in which case we try again.
async function authPassword(password, useCache = true) {
	//Determine if this password is valid.
	if (!pieces || !useCache) {
		pieces = await fetchAuthFile()
		useCache = false //Flag for later.
	}

	let valid = (pieces.find((piece) => {
		//Hash the salt and the provided password
		let hash = getHash(piece.salt, password)
		//If the hash matches the auth hash, valid.
		if (hash === piece.hash) {
			return true
		}
	}) !== undefined)

	//If not valid, but we used cache, retry not caching.
	if (!valid && useCache) {
		return await authPassword(password, false)
	}
	return valid
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
	authPassword
}
