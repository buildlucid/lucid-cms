import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/media.js";
import { mediaServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
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

const restoreMultipleController = factory.createHandlers(
	describeRoute({
		description: "Restore multiple media items by IDs.",
		tags: ["media"],
		summary: "Restore Multiple Media",
		responses: honoOpenAPIResponse({
			noProperties: true,
		}),
		requestBody: honoOpenAPIRequestBody(controllerSchemas.restoreMultiple.body),
		parameters: honoOpenAPIParamaters({
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate,
	permissions([Permissions.UpdateMedia]),
	validate("json", controllerSchemas.restoreMultiple.body),
	async (c) => {
		const { ids } = c.req.valid("json");
		const context = getServiceContext(c);

		const restoreRes = await serviceWrapper(mediaServices.restoreMultiple, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_update_error_name"),
				message: T("route_media_update_error_message"),
			},
		})(context, {
			ids,
		});
		if (restoreRes.error) throw new LucidAPIError(restoreRes.error);

		c.status(201);
		return c.body(null);
	},
);

export default restoreMultipleController;
