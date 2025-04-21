import createSingle from "./create-single.js";
import getSingle from "./get-single.js";
import getMultiple from "./get-multiple.js";
import deleteSingle from "./delete-single.js";
import updateSingle from "./update-single.js";

interface UserRouteControllers {
	createSingle: typeof createSingle;
	getSingle: typeof getSingle;
	getMultiple: typeof getMultiple;
	deleteSingle: typeof deleteSingle;
	updateSingle: typeof updateSingle;
}

const controllers: UserRouteControllers = {
	createSingle,
	getSingle,
	getMultiple,
	deleteSingle,
	updateSingle,
};

export default controllers;
