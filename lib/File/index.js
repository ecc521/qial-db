class File {
	/**
	 * Represents a file available on the server.
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} path - Path to file relative to base of the study.
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
