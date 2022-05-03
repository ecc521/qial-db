class Scan {
	/**
	 * Represents a scan available on the server.
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - Unique ID for this scan.
	 * @property {File[]} sourceFiles - Array of File objects that compose the scan.
	 * @property {string} precomputed - Path to precomputed output.
	 * @property {string} scanType - Type of scan (CT/MRI).
	 * @property {Subject} [subject] - Subject associated with this scan.
 	*/

	constructor({
		ID,
		sourceFiles,
		precomputed,
		scanType,
		subject,
	}) {
		this.ID = ID
		this.sourceFiles = sourceFiles
		this.precomputed = precomputed
		this.scanType = scanType
		this.setSubject(subject)
	}

	/**
	 * Sets Scan.Subject
	 * @param {Subject} newSubject - Subject to associate with this scan.
	 */
	setSubject(newSubject) {
	    this.subject = newSubject
	};

	toJSON() {
		return JSON.stringify(this)
	}
}

export default Scan
