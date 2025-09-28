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
} from "../../../../utils/open-api/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const deleteBatchController = factory.createHandlers(
	describeRoute({
		description: "Delete a batch of media items and folders by their IDs",
		tags: ["media"],
		summary: "Delete Media Batch",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteBatch.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["delete_media"]),
	validate("json", controllerSchemas.deleteBatch.body),
	async (c) => {
		const { folderIds, mediaIds, recursiveMedia } = c.req.valid("json");

		const deleteBatch = await serviceWrapper(services.media.deleteBatch, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_delete_batch_error_name"),
				message: T("route_media_delete_batch_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
				queue: c.get("queue"),
			},
			{
				folderIds,
				mediaIds,
				recursiveMedia,
				userId: c.get("auth").id,
			},
		);
		if (deleteBatch.error) throw new LucidAPIError(deleteBatch.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteBatchController;
