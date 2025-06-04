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

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Delete a single media item by ID and clear its processed images if media is an image.",
		tags: ["media"],
		summary: "Delete Media",
		responses: honoSwaggerResponse({
			noProperties: true,
		}),
		parameters: honoSwaggerParamaters({
			params: controllerSchemas.deleteSingle.params,
			headers: {
				csrf: true,
			},
		}),
		validateResponse: true,
	}),
	validateCSRF,
	authenticate,
	permissions(["delete_media"]),
	validate("param", controllerSchemas.deleteSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");

		const deleteSingle = await serviceWrapper(services.media.deleteSingle, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_delete_error_name"),
				message: T("route_media_delete_error_message"),
			},
		})(
			{
				db: c.get("config").db.client,
				config: c.get("config"),
				services: services,
			},
			{
				id: Number.parseInt(id, 10),
			},
		);
		if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
