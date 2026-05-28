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
import { serverText } from "../../../i18n/index.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import createServiceContext from "../../utils/create-service-context.js";

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
		const context = createServiceContext(c);

		const revertEmailChange = await serviceWrapper(
			accountServices.revertEmailChange,
			{
				transaction: true,
				defaultError: {
					type: "basic",
					name: serverText("core.routes.revert.email.change.error.name"),
					message: serverText("core.routes.revert.email.change.error.message"),
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
