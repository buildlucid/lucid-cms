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
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const confirmEmailChangeController = factory.createHandlers(
	describeRoute({
		description: "Confirms a pending email change.",
		tags: ["account"],
		summary: "Confirm Email Change",
		responses: honoOpenAPIResponse(),
		parameters: honoOpenAPIParamaters({
			headers: {
				csrf: true,
			},
			params: controllerSchemas.confirmEmailChange.params,
		}),
	}),
	validateCSRF,
	validate("param", controllerSchemas.confirmEmailChange.params),
	async (c) => {
		const { token } = c.req.valid("param");
		const context = createServiceContext(c);

		const confirmEmailChange = await serviceWrapper(
			accountServices.confirmEmailChange,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:core.routes.confirm.email.change.error.name"),
					message: copy(
						"server:core.routes.confirm.email.change.error.message",
					),
				},
			},
		)(context, {
			token,
		});

		if (confirmEmailChange.error) {
			throw new LucidAPIError(confirmEmailChange.error);
		}

		c.status(204);
		return c.body(null);
	},
);

export default confirmEmailChangeController;
