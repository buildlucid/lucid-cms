import { createFactory } from "hono/factory";
import constants from "../../../../constants/constants.js";
import { controllerSchemas } from "../../../../schemas/deploys.js";
import { deployServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import rateLimiter from "../../middleware/rate-limiter.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const webhookController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Takes run status updates from a deploy's host, for providers that verify and read them, such as GitHub's workflow run webhooks.",
		tags: ["deploys"],
		summary: "Receive Deploy Webhook",
		responses: openAPI.responses({ noProperties: true }),
		parameters: openAPI.parameters({
			params: controllerSchemas.webhook.params,
		}),
	})),
	rateLimiter({
		mode: "ip",
		limit: constants.rateLimit.scopes.standard.limit,
		scope: constants.rateLimit.scopes.standard.scopeKey,
		windowMs: 60_000,
	}),
	validate("param", controllerSchemas.webhook.params),
	async (c) => {
		const { key } = c.req.valid("param");
		const context = createServiceContext(c);

		const result = await serviceWrapper(deployServices.receiveWebhook, {
			transaction: false,
			defaultError: {
				type: "basic",
				message: copy("server:core.deploys.webhook.failed"),
			},
		})(context, { key, request: c.req.raw });
		if (result.error) throw new LucidAPIError(result.error);

		c.status(204);
		return c.body(null);
	},
);

export default webhookController;
