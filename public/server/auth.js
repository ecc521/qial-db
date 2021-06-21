const crypto = require("crypto")

const loadDataCSV = require("./loadDataCSV.js")

async function getAuthorizedUsers() {
	let csv = await loadDataCSV(false, "Sheet1", `1Kk96cTM0LPZ54IKIXTPPymsejLsyW-Dh-CotgAVo6MM`)
	let json = csv.json

	let users = Object.create(null)
	json.forEach((obj) => {
		users[obj.Name.toLowerCase()] = obj
	})

	return users
}

function getHash(salt, password) {
	return crypto.createHash("sha256").update(salt + password).digest("hex")
}

function isPasswordCorrect(password, saltHashCombo) {
	let salt = saltHashCombo.slice(0, 64)
	let hash = saltHashCombo.slice(64, 128)

	if (getHash(salt, password) === hash) {return true}
	else {return false}
}

//Return a proper entry for this password.
function generateEntry(password) {
	let salt = crypto.randomBytes(32).toString("hex")
	return salt + getHash(salt, password)
}

module.exports = {
	getHash,
	isPasswordCorrect,
	generateEntry,
	getAuthorizedUsers,
}
