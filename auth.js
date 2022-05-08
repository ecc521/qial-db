import admin from "firebase-admin"

const serviceAccount = JSON.parse(fs.readFileSync("./protected/qial_db_firebase_adminsdk.json", {encoding: "utf-8"}));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const db = admin.firestore();
const auth = admin.auth();

const users = db.collection("users")

function createAuthChecker(requiredPermissions = {}) {
    return function checkAuth(req, res, next) {
        if (req.headers.authtoken) {
            auth.verifyIdToken(req.headers.authtoken)
            .then((user) => {
                users.get(user.uid).then((querySnapshot) => {
                    let userDoc = querySnapshot.docs[0]
                    let data = userDoc.data()
                    console.log(data)

                    let permissions = data.permissions

                    for (let prop in requiredPermissions) {
                        if (permissions[prop] !== requiredPermissions[prop]) {
                            return res.status(403).send(`Permission ${prop} not posessed or insuffecient. `)
                        }
                    }

                    req.session = {
                        user,
                        data
                    }
                    next()
                }, (e) => {
                    res.status(500).send('Error Verifying Sign In: ' + e.message)
                })
            }).catch(() => {
                res.status(403).send('Sign In Invalid')
            });
        } else {
            res.status(403).send('Not Signed In')
        }
    }
}


export default createAuthChecker
