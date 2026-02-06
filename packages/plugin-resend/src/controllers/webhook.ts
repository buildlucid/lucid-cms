import {
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
	LucidAPIError,
	serviceWrapper,
} from "@lucidcms/core/api";
import type { LucidHonoContext } from "@lucidcms/core/types";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../schema/webhook.js";
import webhook from "../services/webhook.js";
import T from "../translations/index.js";
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

			const webhookRes = await serviceWrapper(webhook, {
				transaction: true,
				defaultError: {
					type: "basic",
					name: T("route_resend_webhook_error_name"),
					message: T("route_resend_webhook_error_message"),
				},
			})(
				{
					db: { client: c.get("config").db.client },
					config: c.get("config"),
					queue: c.get("queue"),
					env: c.get("env"),
					kv: c.get("kv"),
					requestUrl: c.req.url,
				},
				{
					rawBody: rawBody,
					headers: c.req.header(),
					pluginOptions: pluginOptions,
				},
			);
			if (webhookRes.error) throw new LucidAPIError(webhookRes.error);

			c.status(200);
			return c.body(null);
		},
	);

export default webhookController;
