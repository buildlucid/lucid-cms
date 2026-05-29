import {
	createServiceContext,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
	LucidAPIError,
	serviceWrapper,
	text,
} from "@lucidcms/core/plugin";
import type { LucidHonoContext } from "@lucidcms/core/types";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../schema/webhook.js";
import webhook from "../services/webhook.js";
import type { PluginOptions } from "../types/types.js";

const factory = createFactory();

const webhookController = (pluginOptions: PluginOptions) =>
	factory.createHandlers(
		describeRoute({
			description: "Webhook for receiving delivery status updates.",
			tags: ["resend-plugin"],
			summary: "Resend Webhook",
			requestBody: honoOpenAPIRequestBody(controllerSchemas.webhook.body),
			responses: honoOpenAPIResponse({
				noProperties: true,
			}),
		}),
		// validate("json", controllerSchemas.webhook.body),
		async (c: LucidHonoContext) => {
			const rawBody = await c.req.text();
			const context = createServiceContext(c);

			const webhookRes = await serviceWrapper(webhook, {
				transaction: true,
				defaultError: {
					type: "basic",
					name: text.server("plugin.resend.routes.webhook.error.name"),
					message: text.server("plugin.resend.routes.webhook.error.message"),
				},
			})(context, {
				rawBody: rawBody,
				headers: c.req.header(),
				pluginOptions: pluginOptions,
			});
			if (webhookRes.error) throw new LucidAPIError(webhookRes.error);

			c.status(200);
			return c.body(null);
		},
	);

export default webhookController;
