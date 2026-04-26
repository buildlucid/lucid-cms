import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const revertEmailChangeController = factory.createHandlers(
	describeRoute({
		description: "Cancels or reverts an email change.",
		tags: ["account"],
		summary: "Cancel or Revert Email Change",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.revertEmailChange.params,
		}),
	}),
	validateCSRF,
	validate("param", controllerSchemas.revertEmailChange.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = getServiceContext(c);

		const revertEmailChange = await serviceWrapper(
			accountServices.revertEmailChange,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_revert_email_change_error_name"),
					message: T("route_revert_email_change_error_message"),
				},
			},
		)(context, {
			token,
		});

		if (revertEmailChange.error)
			throw new LucidAPIError(revertEmailChange.error);

		c.status(204);
		return c.body(null);
	},
);

export default revertEmailChangeController;
