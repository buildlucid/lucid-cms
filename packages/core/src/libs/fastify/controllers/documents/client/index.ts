import getSingle from "./get-single.js";
import getMultiple from "./get-multiple.js";

interface DocumentClientRouteControllers {
	getSingle: typeof getSingle;
	getMultiple: typeof getMultiple;
}

const controllers: DocumentClientRouteControllers = {
	getSingle,
	getMultiple,
};

export default controllers;
