import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { mediaServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import { ExternalScopes } from "../../../../permission/external-scopes.js";
import externalAuthentication from "../../../middleware/external-authenticate.js";
import externalScopes from "../../../middleware/external-scopes.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const resolveUrlController = factory.createHandlers(
	describeRoute({
		description:
			"Get a single media item by key and return the public CDN URL. This supports image presets and formats.",
		tags: ["content-media"],
		summary: "Get Media URL",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.content.resolveUrl.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.content.resolveUrl.params,
			headers: {
				authorization: true,
			},
		}),
		requestBody: openAPI.requestBody(controllerSchemas.content.resolveUrl.body),
	}),
	externalAuthentication(),
	externalScopes([ExternalScopes.MediaResolveUrl]),
	validate("param", controllerSchemas.content.resolveUrl.params),
	validate("json", controllerSchemas.content.resolveUrl.body),
	async (c) => {
		const context = createServiceContext(c);

		const media = await serviceWrapper(mediaServices.content.resolveUrl, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.fetch.error.name"),
				message: copy("server:core.routes.media.fetch.error.message"),
			},
		})(context, {
			key: c.req.valid("param").key,
			options: c.req.valid("json"),
		});
		if (media.error) throw new LucidAPIError(media.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: media.data,
			}),
		);
	},
);

export default resolveUrlController;
