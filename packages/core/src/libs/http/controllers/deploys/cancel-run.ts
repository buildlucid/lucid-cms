import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../schemas/deploys.js";
import { deployServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const cancelRunController = factory.createHandlers(
	describeRoute({
		description:
			"Cancels a queued, starting or running deploy run, stopping it on the host when the provider can, so its deploy's queued run can start.",
		tags: ["deploys"],
		summary: "Cancel Deploy Run",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.cancelRun.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF(),
	authenticate(),
	validate("param", controllerSchemas.cancelRun.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		//* the service opens its own transaction once the host has answered
		const result = await serviceWrapper(deployServices.cancelRun, {
			transaction: false,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.run.cancel.failed"),
			},
		})(context, { id: Number.parseInt(id, 10), actor: c.get("auth") });
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default cancelRunController;
