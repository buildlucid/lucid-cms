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

const deleteSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Permanently delete a single media item by ID and clear its processed images if media is an image.",
		tags: ["media"],
		summary: "Delete Media Permanently",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.deleteSinglePermanently.params,
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.DeleteMedia]),
	validate("param", controllerSchemas.deleteSinglePermanently.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const deleteSingle = await serviceWrapper(
			mediaServices.deleteSinglePermanently,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_media_delete_error_name"),
					message: T("route_media_delete_error_message"),
				},
			},
		)(context, {
			id: Number.parseInt(id, 10),
			userId: c.get("auth").id,
		});
		if (deleteSingle.error) throw new LucidAPIError(deleteSingle.error);

		c.status(204);
		return c.body(null);
	},
);

export default deleteSingleController;
