import T from "../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/media.js";
import { describeRoute } from "hono-openapi";
import services from "../../../../services/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoSwaggerResponse,
	honoSwaggerParamaters,
} from "../../../../utils/swagger/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import permissions from "../../middleware/permissions.js";

const factory = createFactory();

const clearSingleProcessedController = factory.createHandlers(
	describeRoute({
		description:
			"Clear all processed images for a single media item based on the given key.",
		tags: ["media"],
		summary: "Clear Processed Images",
		responses: honoSwaggerResponse({
			noProperties: true,
		}),
		parameters: honoSwaggerParamaters({
			params: controllerSchemas.clearSingleProcessed.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["update_media"]),
	validate("param", controllerSchemas.clearSingleProcessed.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const clearProcessed = await serviceWrapper(
			services.processedImage.clearSingle,
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
				services: services,
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
