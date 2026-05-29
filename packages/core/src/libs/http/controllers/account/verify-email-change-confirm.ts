import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/account.js";
import { accountServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import validate from "../../middleware/validate.js";
import createServiceContext from "../../utils/create-service-context.js";

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
		const context = createServiceContext(c);

		const tokenResult = await serviceWrapper(
			accountServices.verifyEmailChangeConfirm,
			{
				transaction: false,
				defaultError: {
					type: "basic",
					name: copy(
						"server:core.routes.verify.email.change.confirm.error.message",
					),
					message: copy(
						"server:core.routes.verify.email.change.confirm.error.message",
					),
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
