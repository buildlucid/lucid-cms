import z from "zod";
import T from "../../../../translations/index.js";
import { controllerSchemas } from "../../../../schemas/media.js";
import {
	swaggerResponse,
	swaggerHeaders,
} from "../../../../utils/swagger/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import type { RouteController } from "../../../../types/types.js";

const createSingleController: RouteController<
	typeof controllerSchemas.createSingle.params,
	typeof controllerSchemas.createSingle.body,
	typeof controllerSchemas.createSingle.query.string,
	typeof controllerSchemas.createSingle.query.formatted
> = async (request, reply) => {
	const mediaIdRes = await serviceWrapper(
		request.server.services.media.createSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_create_error_name"),
				message: T("route_media_create_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			key: request.body.key,
			fileName: request.body.fileName,
			title: request.body.title,
			alt: request.body.alt,
			visible: true,
			width: request.body.width,
			height: request.body.height,
			blurHash: request.body.blurHash,
			averageColour: request.body.averageColour,
			isDark: request.body.isDark,
			isLight: request.body.isLight,
		},
	);
	if (mediaIdRes.error) throw new LucidAPIError(mediaIdRes.error);

	reply.status(204).send();
};

export default {
	controller: createSingleController,
	zodSchema: controllerSchemas.createSingle,
	swaggerSchema: {
		description: "Creates a single media item.",
		tags: ["media"],
		summary: "Create Media",

		headers: swaggerHeaders({
			csrf: true,
		}),
		body: z.toJSONSchema(controllerSchemas.createSingle.body),
		response: swaggerResponse({
			noProperties: true,
		}),
	},
};
