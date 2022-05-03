class File {
	/**
	 * Represents a file available on the server.
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} path - Relative path to the file. MUST BE UNIQUE AMONG FILES!
	 * @property {number} lastModified - Timestamp the file was last modified.
	 * @property {number} size - Size of the file in bytes.
 	*/

	constructor({
		path,
		lastModified,
		size,
	}) {
		this.path = path
		this.lastModified = lastModified
		this.size = size
	}
}

export default File
