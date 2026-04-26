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
import getServiceContext from "../../utils/get-service-context.js";

const factory = createFactory();

const verifyEmailChangeConfirmController = factory.createHandlers(
	describeRoute({
		description: "Verifies an email change confirmation token is valid.",
		tags: ["account"],
		summary: "Verify Email Change Confirmation Token",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.verifyEmailChangeConfirm.params,
		}),
	}),
	validate("param", controllerSchemas.verifyEmailChangeConfirm.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = getServiceContext(c);

		const tokenResult = await serviceWrapper(
			accountServices.verifyEmailChangeConfirm,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: T("route_verify_email_change_confirm_error_name"),
					message: T("route_verify_email_change_confirm_error_message"),
				},
			},
		)(context, {
			token,
		});

		if (tokenResult.error) throw new LucidAPIError(tokenResult.error);

		c.status(204);
		return c.body(null);
	},
);

export default verifyEmailChangeConfirmController;
