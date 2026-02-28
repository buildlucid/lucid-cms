import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

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
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.MediaDelete]),
	validate("json", controllerSchemas.deleteBatch.body),
	async (c) => {
		const { folderIds, mediaIds, recursiveMedia } = c.req.valid("json");
		const context = getServiceContext(c);

		const deleteBatch = await serviceWrapper(mediaServices.deleteBatch, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_delete_batch_error_name"),
				message: T("route_media_delete_batch_error_message"),
			},
		})(context, {
			folderIds,
			mediaIds,
			recursiveMedia,
			userId: c.get("auth").id,
		});
		if (deleteBatch.error) throw new LucidAPIError(deleteBatch.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteBatchController;
