import getSingle from "./get-single.js";
import getAll from "./get-all.js";

interface CollectionRouteControllers {
	getSingle: typeof getSingle;
	getAll: typeof getAll;
}

const controllers: CollectionRouteControllers = {
	getSingle,
	getAll,
};

export default controllers;
