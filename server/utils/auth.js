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
 * @returns {boolean} Returns true and assigns req.session if user successfully authenticated with requiredPermissions. Returns false and ends the request if authentication failed (not signed in or does not posess permissions).
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
		res.status(403).end('Not Signed In')
		return false
	}

	let user;
	try {
		user = await auth.verifyIdToken(authToken)
	}
	catch (e) {
		res.status(403).end("Sign in Invalid")
		return false
	}

	try {
		let querySnapshot = await users.get(user.uid)
		let userDoc = querySnapshot.docs[0]
		let data = userDoc.data()
		console.log(data)

		let permissions = data.permissions

		for (let prop in requiredPermissions) {
			if (requiredPermissions[prop] && !permissions[prop]) {
				return res.status(403).end(`Permission ${prop} required but not posessed. `)
			}
		}

		req.session = {
			user,
			data
		}
		return true //User is signed in and has the necessary permissions.
	}
	catch (e) {
		res.status(500).end('Error Verifying Sign In: ' + e.message)
		return false
	}
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
        let authed = await checkAuth(req, res, requiredPermissions)
		if (authed) {next()}
    }
}


export {checkAuth, checkAuthMiddleware}
