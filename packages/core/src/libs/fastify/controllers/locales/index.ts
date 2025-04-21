import client from "./client/index.js";
import getSingle from "./get-single.js";
import getAll from "./get-all.js";

interface LocaleRouteControllers {
	client: typeof client;
	getSingle: typeof getSingle;
	getAll: typeof getAll;
}

const controllers: LocaleRouteControllers = {
	client,
	getSingle,
	getAll,
};

export default controllers;
