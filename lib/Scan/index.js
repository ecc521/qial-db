class Scan {
	/**
	 * Represents a scan available on the server.
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - ID referring to this Scan. Must be unique within a Study.
	 * @property {String[]} sourceFiles - Array of IDs for file objects that compose the scan.
	 * @property {string} precomputed - Path to precomputed output relative to base of the study.
	 * @property {string} scanType - Type of scan (CT, MRI, etc).
	 * @property {string} [labelID] - ID of Scan containing labels for this scan.
	 * @property {string} [subjectID] - ID of Subject associated with this scan.
 	*/


	//TODO: How to handle labels for scans? Use scanType=label? How do we associate?

	constructor({
		ID,
		sourceFiles,
		precomputed,
		scanType,
		subjectID,
		labelID,
	}) {
		this.ID = ID
		this.sourceFiles = sourceFiles
		this.precomputed = precomputed
		this.scanType = scanType
		this.setSubjectID(subjectID)
		this.setLabelID(labelID)
	}

	/**
	 * Sets Scan.Subject
	 * @param {Subject} newSubject - Subject to associate with this scan.
	 */
	setSubjectID(newSubjectID) {
	    this.subjectID = newSubjectID
	};

	/**
	 * Sets Scan.labelID
	 * @param {Subject} newLabelID - Label ID to associate with this scan.
	 */
	setLabelID(newLabelID) {
		this.labelID = newLabelID
	};
}

export default Scan
