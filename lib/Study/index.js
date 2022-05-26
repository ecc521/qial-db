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
	 * @property {string} path - Path to the study. This will serve as a prefix to paths on Files, Scans, and Subjects.

	 * @property {StudyContents} [contents] - Contents of the Study.
 	*/

	//TODO: Allow markup for study description.
	//TODO: Add topics for studies. We'll want additional ways to search for studies as more are added.
	//TODO: We should probably allow studies to have an image displayed besides them as well.

	constructor(config) {
		Object.assign(this, config)

		if (!this.ID) {throw "Must have ID"}
		this.name = this.name || ""
		this.description = this.description || ""
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

export default Study
