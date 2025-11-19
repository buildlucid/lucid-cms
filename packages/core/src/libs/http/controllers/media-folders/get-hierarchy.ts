import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/media-folders.js";
import { describeRoute } from "hono-openapi";
import { mediaFolderServices } from "../../../../services/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Get all media folders with hierarchy metadata.",
		tags: ["media-folders"],
		summary: "Get Media Folders Hierarchy",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.hierarchy.response),
		}),
		validateResponse: true,
	}),
	authenticate,
	async (c) => {
		const folders = await serviceWrapper(mediaFolderServices.getHierarchy, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_folders_fetch_error_name"),
				message: T("route_media_folders_fetch_error_message"),
			},
		})({
			db: c.get("config").db.client,
			config: c.get("config"),
			queue: c.get("queue"),
			env: c.get("env"),
			kv: c.get("kv"),
		});
		if (folders.error) throw new LucidAPIError(folders.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: folders.data,
			}),
		);
	},
);

export default getAllController;
