/**
 * @overview Used to check user authentication and permissions.
 */

import fs from "fs";
import admin from "firebase-admin"

const serviceAccount = JSON.parse(fs.readFileSync("./protected/qial_db_firebase_adminsdk.json", {encoding: "utf-8"}));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const users = db.collection("users")


/**
 * @typedef {Object} UserPermissions
 * @property {boolean} add - Whether user is permitted to add data.
 * @property {boolean} write - Whether user is permitted to change or delete existing data.
 * @property {boolean} move - Whether user is permitted to relocate data
 */

/**
 * @params {Object} req - Express request object.
 * @params {Object} res - Express response object.
 * @params {UserPermissions} requiredPermissions - Permissions to check. Properties that are false may be omitted.
 * @throws Throws and ends the request if authentication failed (not signed in or does not posess permissions).
 * @returns {boolean} Returns true and assigns req.session if user successfully authenticated with requiredPermissions.
 *
 */

async function checkAuth(req, res, requiredPermissions) {
	if (!requiredPermissions) {
		//If res was not included, requiredPermissions may not be in the correct spot,
		//yet an error would not be triggered. We will force requiredPermissions to be defined to protect against bad arguments.
		throw "Argument Error. requiredPermissions may be an empty object, but must be defined. "
	}

	let authToken = req.headers.authtoken
	if (!authToken) {
		let message = "Not Signed In"
		res.status(403).end(message)
		throw message
	}

	let user;
	try {
		user = await auth.verifyIdToken(authToken)
	}
	catch (e) {
		let message = "Sign in Invalid"
		res.status(403).end(message)
		throw message
	}


	let data, permissions;
	try {
		let querySnapshot = await users.get(user.uid)

		let userDoc = querySnapshot.docs[0]
		data = userDoc.data()

		permissions = data.permissions
	}
	catch (e) {
		let message = `Server Obtaining User Permissions and Information: ${e.message}`
		res.status(500).end(message)
		throw message
	}

    console.log(permissions)

	for (let prop in requiredPermissions) {
		if (requiredPermissions[prop] && !permissions?.[prop]) {
			let message = `Permission ${prop} required but not posessed. `
			res.status(403).end(message)
			throw message
		}
	}

	req.session = {
		user,
		data
	}
	return true //User is signed in and has the necessary permissions.
}

/**
 * @params {UserPermissions} requiredPermissions - Permissions to check. Properties that are false may be omitted.
 * @returns {Function} Returns a function that can be used with Express to verify authentication on a path.
 * @example
 * app.use("/authedpath", createAuthMiddleware({write: true}))
 * app.all("/authedpath", authenticatedHandler) //Will only be called if user has write permission.
 */
function checkAuthMiddleware(requiredPermissions) {
    return async function verifyRequest(req, res, next) {
        await checkAuth(req, res, requiredPermissions)
		next()
    }
}


export {checkAuth, checkAuthMiddleware}
