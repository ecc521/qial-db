class Study {
	/**
	 * Represents a Study. A study is a a self contained set of Files, Scans, Subjects, and DataClasses.
	 * The files for a study should be self contained on disk (ie, there should not be multiple different Studies in one directory).
	 * This class can be used both client and server side.
	 * @constructor
	 * @param {Object} config - Configuration object.
	 *
	 * @property {string} ID - Unique ID referring to this Study.
	 * @property {string} [name] - Name for this study.
	 * @property {string} [description] - Description for this study.

	 * @property {StudyContents} [contents] - Contents of the Study.
 	*/

	//TODO: Allow markup for study description.

	constructor({
		ID,
		name = "Study",
		description = "No Description Available. ",
	}) {
		this.ID = ID
		this.name = name
		this.description = description
	}

	/**
	 * @typedef {Object} StudyContents
	 * @property {Map<String, File>} Files
	 * @property {Map<String, Scan>} Scans
	 * @property {Map<String, Subject>} Subjects
	 */
	contents = {
		Files: new Map(),
		Scans: new Map(),
		Subjects: new Map(),
	}
}

export default Subject
