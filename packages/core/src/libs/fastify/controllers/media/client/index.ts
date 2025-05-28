import processMedia from "./process-media.js";

interface MediaClientRouteControllers {
	processMedia: typeof processMedia;
}

const controllers: MediaClientRouteControllers = {
	processMedia,
};

export default controllers;
