import { createFactory } from "hono/factory";
import type { StatusCode } from "hono/utils/http-status";
import { describeRoute } from "hono-openapi";
import {
	oauthErrorResponseSchema,
	oauthProtectedResourceMetadataResponseSchema,
} from "../../../../schemas/oauth.js";
import { oauthServices } from "../../../../services/index.js";
import type { LucidHonoContext } from "../../../../types/hono.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { oauthFormatter } from "../../../formatters/index.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const protectedResourceMetadataController = factory.createHandlers(
	describeRoute({
		description: "Returns metadata for the Lucid external API resource.",
		tags: ["oauth"],
		summary: "Get OAuth Protected Resource Metadata",
		responses: {
			200: {
				description: "OAuth protected resource metadata.",
				content: {
					"application/json": {
						schema: openAPI.schema(
							oauthProtectedResourceMetadataResponseSchema,
						),
					},
				},
			},
			default: {
				description: "OAuth protocol error.",
				content: {
					"application/json": {
						schema: openAPI.schema(oauthErrorResponseSchema),
					},
				},
			},
		},
	}),
	async (c: LucidHonoContext) => {
		const context = createServiceContext(c);
		const result = await serviceWrapper(
			oauthServices.getProtectedResourceMetadata,
			{
				transaction: false,
				defaultError: { type: "basic" },
			},
		)(context);
		if (result.error) {
			c.header("Cache-Control", "no-store");
			c.header("Pragma", "no-cache");
			c.header("Referrer-Policy", "no-referrer");
			c.status((result.error.status ?? 500) as StatusCode);
			return c.json(oauthFormatter.formatError(result.error));
		}

		c.header("Cache-Control", "public, max-age=300");
		return c.json(result.data);
	},
);

export default protectedResourceMetadataController;
