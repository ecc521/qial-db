const crypto = require("crypto")

const loadDataCSV = require("./loadDataCSV.js")
const csvParse = require('csv-parse/lib/sync')

async function getAuthorizedUsers() {
	let csvText = await loadDataCSV(false, "Sheet1", `1Kk96cTM0LPZ54IKIXTPPymsejLsyW-Dh-CotgAVo6MM`)
	let arr = csvParse(csvText, {
		columns: true,
		columns_duplicates_to_array: true //Duplicate columns aren't yet supported here, but we might add something later.
	})

	let users = Object.create(null)
	arr.forEach((obj) => {
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
