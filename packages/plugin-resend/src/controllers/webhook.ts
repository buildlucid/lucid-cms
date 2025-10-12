import T from "../translations/index.js";
import { controllerSchemas } from "../schema/webhook.js";
import webhook from "../services/webhook.js";
import {
	serviceWrapper,
	LucidAPIError,
	honoOpenAPIResponse,
	honoOpenAPIRequestBody,
} from "@lucidcms/core/api";
import type { PluginOptions } from "../types/types.js";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import type { LucidHonoContext } from "@lucidcms/core/types";

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
			validateResponse: true,
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
					db: c.get("config").db.client,
					config: c.get("config"),
					queue: c.get("queue"),
					env: c.get("env"),
					kv: c.get("kv"),
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
