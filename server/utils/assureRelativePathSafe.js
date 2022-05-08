/**
 * @overview Used to protect against path travseral attacks.
 */

import path from "path";

/**
 * @param {string} relSrc - Relative path to check.
 * @throws Throws an error if the relative path attempts to traverse the filesystem or enter the protected directory.
 * @returns {boolean} true
 */

function assureRelativePathSafe(relSrc) {
    while (path.isAbsolute(relSrc)) {
        //Cut off leading characters until not absolute.
        //This is necessary to ensure normalize works properly.
        //If the path is absolute, we will only reduce down to / in this processing, yet outside of assureRelativePathSafe all the parts will be considered.
        //We should only need to trim one leading slash, though it is possible more have been added (and hence we loop until reltative path obtained)
        relSrc = relSrc.slice(1)
    }

    let normalizedPath = path.normalize(relSrc)

    let testPath = path.join("a", "b")

    if (!path.join(testPath, normalizedPath).startsWith(testPath)) {
        //If the path does backwards directories, it will be disallowed.
        throw "Path Traversal Forbidden"
    }

    if (normalizedPath.startsWith("protected")) {
        //Ensure protected directory is protected.
        throw "403 Forbidden"
    }

    return true
}




//Tests for assureRelativePathSafe
assureRelativePathSafe("/index.html")

try {
    assureRelativePathSafe("/../priorDir.html")
    throw "assureRelativePathSafe failed traversal check"
}
catch (e) {
    if (e != "Path Traversal Forbidden") {throw e}
}


try {
    assureRelativePathSafe("/protected/hidden.html")
    throw "assureRelativePathSafe failed protected check"
}
catch (e) {
    if (e != "403 Forbidden") {throw e}
}
//End of tests for assureRelativePathSafe




export default assureRelativePathSafe
