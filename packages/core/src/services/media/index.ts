import checks from "./checks/index.js";
import strategies from "./strategies/index.js";

import getSingle from "./get-single.js";
import deleteSingle from "./delete-single.js";
import deleteSinglePermanently from "./delete-single-permanently.js";
import getMultiple from "./get-multiple.js";
import updateSingle from "./update-single.js";
import getPresignedUrl from "./get-presigned-url.js";
import createSingle from "./create-single.js";
import getMultipleFieldMeta from "./get-multiple-field-meta.js";
import processMedia from "./process-media.js";
import moveFolder from "./move-folder.js";
import deleteBatch from "./delete-batch.js";
import restoreMultiple from "./restore-multiple.js";

export default {
	checks,
	strategies,

	getSingle,
	deleteSingle,
	deleteSinglePermanently,
	getMultiple,
	updateSingle,
	getPresignedUrl,
	createSingle,
	getMultipleFieldMeta,
	processMedia,
	moveFolder,
	deleteBatch,
	restoreMultiple,
};
