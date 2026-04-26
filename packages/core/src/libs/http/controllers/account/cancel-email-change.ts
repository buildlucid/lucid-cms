import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const cancelEmailChangeController = factory.createHandlers(
	describeRoute({
		description: "Cancels the authenticated user's pending email change.",
		tags: ["account"],
		summary: "Cancel Pending Email Change",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
		}),
	}),
	validateCSRF,
	authenticate,
	async (c) => {
		const context = getServiceContext(c);

		const cancelEmailChange = await serviceWrapper(
			accountServices.cancelEmailChange,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_cancel_email_change_error_name"),
					message: T("route_cancel_email_change_error_message"),
				},
			},
		)(context, {
			userId: c.get("auth").id,
		});

		if (cancelEmailChange.error)
			throw new LucidAPIError(cancelEmailChange.error);

		c.status(204);
		return c.body(null);
	},
);

export default cancelEmailChangeController;
