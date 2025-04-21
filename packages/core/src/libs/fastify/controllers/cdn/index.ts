import streamSingle from "./stream-single.js";

interface CDNRouteControllers {
	streamSingle: typeof streamSingle;
}

const controllers: CDNRouteControllers = {
	streamSingle,
};

export default controllers;
