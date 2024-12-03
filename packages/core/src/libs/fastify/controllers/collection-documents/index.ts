import client from "./client/index.js";
import getSingle from "./get-single.js";
import getMultiple from "./get-multiple.js";
import getMultipleRevisions from "./get-multiple-revisions.js";
import deleteMultiple from "./delete-multiple.js";
import deleteSingle from "./delete-single.js";
import restoreRevision from "./restore-revision.js";
import createSingle from "./create-single.js";
import updateSingle from "./update-single.js";
import promoteVersion from "./promote-version.js";

export default {
	client,
	getSingle,
	getMultiple,
	getMultipleRevisions,
	deleteMultiple,
	deleteSingle,
	restoreRevision,
	createSingle,
	updateSingle,
	promoteVersion,
};
