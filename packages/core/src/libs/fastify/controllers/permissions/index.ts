import getAll from "./get-all.js";

interface PermissionRouteControllers {
	getAll: typeof getAll;
}

const controllers: PermissionRouteControllers = {
	getAll,
};

export default controllers;
