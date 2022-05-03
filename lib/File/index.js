class File {
	/**
	 * Represents a file available on the server.
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} path - Relative path to the file.
	 * @property {number} lastModified - Timestamp the file was last modified.
	 * @property {number} bytes - Size of the file in bytes.
 	*/

	constructor({
		path,
		lastModified,
		bytes,
	}) {
		this.path = path
		this.lastModified = lastModified
		this.bytes = bytes
	}
}

export default File
