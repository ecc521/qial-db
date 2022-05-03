class Subject {
	/**
	 * Represents a subject (animal, plant, etc).
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - Unique ID referring to this Subject.
	 * @property {string[]} [scanIDs] - IDs of Scans associated with this Subject.
 	*/

	constructor({
		ID,
		scanIDs = []
	}) {
		this.ID = ID
		this.scanIDs = scanIDs
	}

	/**
	 * Adds scans to the Subject.
	 * @param {string|string[]} newScanIDs - IDs of scans to add to scanIDs.
	 */
	addScanIDs(newScanIDs) {
		if (!(newScanIDs instanceof Array)) {newScanIDs = [newScanIDs]}

		for (let scanID of newScanIDs) {
			this.scanIDs.push(scanID)
		}
	};

	//TODO: We probably want to link Subjects with the files they pull data from.
}

export default Subject
