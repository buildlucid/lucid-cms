import client from "./client/index.js";
import createSingle from "./create-single.js";
import updateSingle from "./update-single.js";
import deleteMultiple from "./delete-multiple.js";
import deleteSingle from "./delete-single.js";
import getSingle from "./get-single.js";
import getMultiple from "./get-multiple.js";
import getMultipleRevisions from "./get-multiple-revisions.js";
import restoreRevision from "./restore-revision.js";
import promoteVersion from "./promote-version.js";

interface DocumentRouteControllers {
	client: typeof client;
	createSingle: typeof createSingle;
	updateSingle: typeof updateSingle;
	deleteMultiple: typeof deleteMultiple;
	deleteSingle: typeof deleteSingle;
	getSingle: typeof getSingle;
	getMultiple: typeof getMultiple;
	getMultipleRevisions: typeof getMultipleRevisions;
	restoreRevision: typeof restoreRevision;
	promoteVersion: typeof promoteVersion;
}

const controllers: DocumentRouteControllers = {
	client,
	createSingle,
	updateSingle,
	deleteMultiple,
	deleteSingle,
	getSingle,
	getMultiple,
	getMultipleRevisions,
	restoreRevision,
	promoteVersion,
};

export default controllers;
