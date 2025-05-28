import client from "./client/index.js";
import getSingle from "./get-single.js";
import updateSingle from "./update-single.js";
import deleteSingle from "./delete-single.js";
import getMultiple from "./get-multiple.js";
import clearSingleProcessed from "./clear-single-processed.js";
import clearAllProcessed from "./clear-all-processed.js";
import getPresignedUrl from "./get-presigned-url.js";
import createSingle from "./create-single.js";

interface MediaRouteControllers {
	client: typeof client;
	updateSingle: typeof updateSingle;
	getSingle: typeof getSingle;
	deleteSingle: typeof deleteSingle;
	getMultiple: typeof getMultiple;
	clearSingleProcessed: typeof clearSingleProcessed;
	clearAllProcessed: typeof clearAllProcessed;
	getPresignedUrl: typeof getPresignedUrl;
	createSingle: typeof createSingle;
}

const controllers: MediaRouteControllers = {
	client,
	updateSingle,
	getSingle,
	deleteSingle,
	getMultiple,
	clearSingleProcessed,
	clearAllProcessed,
	getPresignedUrl,
	createSingle,
};

export default controllers;
