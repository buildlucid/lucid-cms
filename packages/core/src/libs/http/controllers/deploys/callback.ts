import { createFactory } from "hono/factory";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/deploys.js";
import { deployServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const callbackController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Takes a run's status from its CI. The URL is signed for one run and handed to the provider as `callbackUrl`.",
		tags: ["deploys"],
		summary: "Report Deploy Run Status",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.callback.params,
			query: controllerSchemas.callback.query.string,
		}),
		requestBody: openAPI.requestBody(controllerSchemas.callback.body),
	})),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: constants.rateLimit.scopes.standard.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.callback.params),
	validate("query", controllerSchemas.callback.query.string),
	validate("json", controllerSchemas.callback.body),
	async (c) => {
		const { id } = c.req.valid("param");
		const { token } = c.req.valid("query");
		const body = c.req.valid("json");
		const context = createServiceContext(c);

		const result = await serviceWrapper(deployServices.callback, {
			transaction: true,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.callback.failed"),
			},
		})(context, { id: Number.parseInt(id, 10), token, update: body });
		if (result.error) throw new LucidError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default callbackController;
