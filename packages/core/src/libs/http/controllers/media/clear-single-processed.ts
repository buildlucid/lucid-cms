import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/media.js";
import { describeRoute } from "hono-openapi";
import { processedImageServices } from "../../../../services/index.js";
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
import { Permissions } from "../../../permission/definitions.js";

const factory = createFactory();

const clearSingleProcessedController = factory.createHandlers(
	describeRoute({
		description:
			"Clear all processed images for a single media item based on the given key.",
		tags: ["media"],
		summary: "Clear Processed Images",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.clearSingleProcessed.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateMedia]),
	validate("param", controllerSchemas.clearSingleProcessed.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const clearProcessed = await serviceWrapper(
			processedImageServices.clearSingle,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_media_clear_processed_error_name"),
					message: T("route_media_clear_processed_error_message"),
				},
			},
		)(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				id: Number.parseInt(id, 10),
			},
		);
		if (clearProcessed.error) throw new LucidAPIError(clearProcessed.error);

		c.status(204);
		return c.body(null);
	},
);

export default clearSingleProcessedController;
