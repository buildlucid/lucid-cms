import T from "../../translations/index.js";
import mediaSchema from "../../schemas/media.js";
import { swaggerResponse, swaggerHeaders } from "../../utils/swagger/index.js";
import serviceWrapper from "../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../utils/errors/index.js";
import type { RouteController } from "../../types/types.js";

const updateSingleController: RouteController<
	typeof mediaSchema.updateSingle.params,
	typeof mediaSchema.updateSingle.body,
	typeof mediaSchema.updateSingle.query
> = async (request, reply) => {
	const updateMedia = await serviceWrapper(
		request.server.services.media.updateSingle,
		{
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_update_error_name"),
				message: T("route_media_update_error_message"),
			},
		},
	)(
		{
			db: request.server.config.db.client,
			config: request.server.config,
			services: request.server.services,
		},
		{
			id: Number.parseInt(request.params.id),
			fileName: request.body.fileName,
			key: request.body.key,
			title: request.body.title,
			alt: request.body.alt,
		},
	);
	if (updateMedia.error) throw new LucidAPIError(updateMedia.error);

	reply.status(204).send();
};

export default {
	controller: updateSingleController,
	zodSchema: mediaSchema.updateSingle,
	swaggerSchema: {
		description:
			"Update a single media entry with translations and new upload.",
		tags: ["media"],
		summary: "Update a single media entry.",
		response: {
			204: swaggerResponse({
				type: 204,
				noPropertise: true,
			}),
		},
		body: {
			type: "object",
			properties: {
				key: {
					type: "string",
					nullable: true,
				},
				fileName: {
					type: "string",
					nullable: true,
				},
				title: {
					type: "array",
					items: {
						type: "object",
						properties: {
							localeCode: {
								type: "string",
								nullable: true,
							},
							value: {
								type: "string",
								nullable: true,
							},
						},
					},
					nullable: true,
				},
				alt: {
					type: "array",
					items: {
						type: "object",
						properties: {
							localeCode: {
								type: "string",
								nullable: true,
							},
							value: {
								type: "string",
								nullable: true,
							},
						},
					},
					nullable: true,
				},
			},
		},
		headers: swaggerHeaders({
			csrf: true,
		}),
	},
};
