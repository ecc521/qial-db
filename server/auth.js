import * as crypto from "crypto";

import loadDataCSV from "./loadDataCSV.js";
import { parse as csvParse} from 'csv-parse/sync';

async function getAuthorizedUsers() {
	let csvText = await loadDataCSV(false, "Sheet1", `1Kk96cTM0LPZ54IKIXTPPymsejLsyW-Dh-CotgAVo6MM`)
	let arr = csvParse(csvText, {
		columns: true,
		columns_duplicates_to_array: true //Duplicate columns aren't yet supported here, but we might add something later.
	})

	let users = Object.create(null)
	arr.forEach((obj) => {
		users[obj.Name.toLowerCase()] = obj
	})

	return users
}

export {
	getAuthorizedUsers,
}
