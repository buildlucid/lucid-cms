import type { FastifyInstance } from "fastify";
import r from "../../../../route.js";
import media from "../../../../controllers/media/index.js";

const clientMediaRoutes = async (fastify: FastifyInstance) => {
	r(fastify, {
		method: "post",
		url: "/media/process/*",
		middleware: {
			clientAuthentication: true,
		},
		swaggerSchema: media.client.processMedia.swaggerSchema,
		zodSchema: media.client.processMedia.zodSchema,
		controller: media.client.processMedia.controller,
	});
};

export default clientMediaRoutes;
