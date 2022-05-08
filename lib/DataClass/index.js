class DataClass {
	/**
	 * Represents a specific type of data containing information about different Subjects.
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - ID referring to this DataClass. Must be unique within a Study.
	 * @property {string} name - Name for this study.
	 * @property {string} description - Description for this study.
	 * @property {Object} [studyContents] - IDs of Scans associated with this Subject.
 	*/

	constructor({
		ID,
		scanIDs = [],
		dataSources = [],
	}) {
		this.ID = ID
		this.scanIDs = scanIDs
		this.dataSources = dataSources
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
