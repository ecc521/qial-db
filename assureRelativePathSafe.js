import * as path from "path";

//Used to protect against path traversal attacks.
function assureRelativePathSafe(relSrc) {
    let hypoDir = "/a/b"
    let hypoDirSame = "\\a\\b"		// windows path.join will return "\\a\\b\\" from joining of "/a/b" and "/"
    let absSrc = path.join(hypoDir, relSrc)
    if (! (absSrc.startsWith(hypoDir) || absSrc.startsWith(hypoDirSame))) {
        throw "Path Traversal Forbidden"
    }
}

export default assureRelativePathSafe
