import {
	copy,
	createRoute,
	honoOpenAPIRequestBody,
	honoOpenAPIResponse,
	LucidAPIError,
	serviceWrapper,
} from "@lucidcms/core/plugin";
import { controllerSchemas } from "../schema/webhook.js";
import webhook from "../services/webhook.js";
import type { PluginOptions } from "../types/types.js";

const routes = (pluginOptions: PluginOptions) => [
	createRoute({
		method: "post",
		path: "/lucid/api/v1/resend/webhook",
		openAPI: {
			description: "Webhook for receiving delivery status updates.",
			tags: ["resend-plugin"],
			summary: "Resend Webhook",
			requestBody: honoOpenAPIRequestBody(controllerSchemas.webhook.body),
			responses: honoOpenAPIResponse({
				noProperties: true,
			}),
		},
		handler: async ({ hono, context }) => {
			const rawBody = await hono.req.text();

			const webhookRes = await serviceWrapper(webhook, {
				transaction: true,
				defaultError: {
					type: "basic",
					name: copy("server:plugin.resend.routes.webhook.error.name"),
					message: copy("server:plugin.resend.routes.webhook.error.message"),
				},
			})(context, {
				rawBody: rawBody,
				headers: hono.req.header(),
				pluginOptions: pluginOptions,
			});
			if (webhookRes.error) throw new LucidAPIError(webhookRes.error);

			hono.status(200);
			return hono.body(null);
		},
	}),
];

export default routes;
