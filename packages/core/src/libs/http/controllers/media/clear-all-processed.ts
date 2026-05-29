import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { processedImageServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import { Permissions } from "../../../permission/definitions.js";
import authenticate from "../../middleware/authenticate.js";
import permissions from "../../middleware/permissions.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const clearAllProcessedController = factory.createHandlers(
	describeRoute({
		description: "Clears all processed images for a every media item.",
		tags: ["media"],
		summary: "Clear Every Processed Image",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.MediaUpdate]),
	async (c) => {
		const context = createServiceContext(c);

		const clearProcessed = await serviceWrapper(
			processedImageServices.clearAll,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.media.clear.processed.error.name"),
					message: copy(
						"server:core.routes.media.clear.processed.error.message",
					),
				},
			},
		)(context);
		if (clearProcessed.error) throw new LucidAPIError(clearProcessed.error);

		c.status(204);
		return c.body(null);
	},
);

export default clearAllProcessedController;
