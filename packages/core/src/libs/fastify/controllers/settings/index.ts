import getSettings from "./get-settings.js";

interface SettingsRouteControllers {
	getSettings: typeof getSettings;
}

const controllers: SettingsRouteControllers = {
	getSettings,
};

export default controllers;
