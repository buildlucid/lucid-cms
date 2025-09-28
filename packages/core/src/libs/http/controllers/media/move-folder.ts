import z from "zod/v4";
import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/media.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const moveFolderController = factory.createHandlers(
	describeRoute({
		description: "Move a single media entry to a new folder.",
		tags: ["media"],
		summary: "Move Media Folder",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.moveFolder.params,
			headers: {
				csrf: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.moveFolder.body),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["update_media"]),
	validate("param", controllerSchemas.moveFolder.params),
	validate("json", controllerSchemas.moveFolder.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const body = c.req.valid("json");

		const updateMedia = await serviceWrapper(services.media.moveFolder, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_update_error_name"),
				message: T("route_media_update_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
				queue: c.get("queue"),
			},
			{
				id: Number.parseInt(id, 10),
				folderId: body.folderId,
				userId: c.get("auth").id,
			},
		);
		if (updateMedia.error) throw new LucidAPIError(updateMedia.error);

		c.status(204);
		return c.body(null);
	},
);

export default moveFolderController;
