import createSingle from "./create-single.js";
import getAll from "./get-all.js";
import deleteSingle from "./delete-single.js";
import updateSingle from "./update-single.js";
import regenerateKeys from "./regenerate-keys.js";
import getSingle from "./get-single.js";

interface ClientIntegrationRouteControllers {
	createSingle: typeof createSingle;
	getAll: typeof getAll;
	deleteSingle: typeof deleteSingle;
	updateSingle: typeof updateSingle;
	regenerateKeys: typeof regenerateKeys;
	getSingle: typeof getSingle;
}

const controllers: ClientIntegrationRouteControllers = {
	createSingle,
	getAll,
	deleteSingle,
	updateSingle,
	regenerateKeys,
	getSingle,
};

export default controllers;
