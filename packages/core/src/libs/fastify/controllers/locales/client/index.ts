import getAll from "./get-all.js";

interface LocaleClientRouteControllers {
	getAll: typeof getAll;
}

const controllers: LocaleClientRouteControllers = {
	getAll,
};

export default controllers;
