//TODO: We probably want to link Subjects with the files they pull data from.

class Subject {
	/**
	 * Represents a subject (animal, plant, etc).
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - Unique ID referring to this Subject.
	 * @property {Scan[]} [scans] - Scans associated with this Subject.
 	*/

	constructor({
		ID,
		scans = []
	}) {
		this.ID = ID
		this.scans = scans
	}

	/**
	 * Adds scans to the Subject.
	 * @param {Scan|Scan[]} newScans - New scan(s) to add.
	 */
	addScan(newScans) {
		if (!(newScans instanceof Array)) {newScans = [newScans]}

		for (let scan of newScans) {
			this.scans.push(newScan)
		}
	};
}

export default Subject
