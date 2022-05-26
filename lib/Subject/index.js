class Subject {
	/**
	 * Represents a subject (animal, plant, etc).
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - ID referring to this Subject. Must be unique within a Study.
	 * @property {string[]} [scanIDs] - IDs of Scans associated with this Subject.
	 * @property {string[]} [dataSources] - IDs of Files from which this Subject's data was sourced.
 	*/

	constructor(config) {
		Object.assign(this, config)

		if (!this.ID) {throw "Must have ID"}
		this.scanIDs = this.scanIDs || []
		this.dataSources = this.dataSources || []
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

	/**
	 * Adds dataSources to the Subject.
	 * @param {string|string[]} newDataSources - Relative paths of files to add to dataSources.
	 */
	addDataSources(newDataSources) {
		if (!(newDataSources instanceof Array)) {newDataSources = [newDataSources]}

		for (let newDataSource of newDataSources) {
			this.dataSources.push(newDataSource)
		}
	};
}

export default Subject
