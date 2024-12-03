import { route } from "@lucidcms/core/api";
import uploadController from "../controllers/upload.js";
import registerContentTypeParser from "../utils/register-content-type-parser.js";
import type { FastifyInstance } from "fastify";
import type { PluginOptions } from "../types/types.js";

const routes =
	(pluginOptions: PluginOptions) => async (fastify: FastifyInstance) => {
		registerContentTypeParser(fastify, pluginOptions.supportedMimeTypes);

		route(fastify, {
			method: "put",
			url: "/api/v1/localstorage/upload",
			bodyLimit: fastify.config.media.maxSize,
			controller: uploadController.controller(pluginOptions),
			swaggerSchema: uploadController.swaggerSchema,
			zodSchema: uploadController.zodSchema,
		});
	};

export default routes;
