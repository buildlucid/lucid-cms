import { minutesToSeconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { mediaServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import cacheKeys from "../../../../kv/cache-keys.js";
import { ClientScopes } from "../../../../permission/client-scopes.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import clientScopes from "../../../middleware/client-scopes.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Get a single media item by ID via the client integration. Returns translated metadata.",
		tags: ["client-media"],
		summary: "Get Media",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.client.getSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.client.getSingle.params,
			headers: {
				authorization: true,
			},
		}),
	}),
	clientAuthentication,
	clientScopes([ClientScopes.MediaRead]),
	validate("param", controllerSchemas.client.getSingle.params),
	cache({
		ttl: minutesToSeconds(5),
		mode: "static",
		staticKey: (c) => {
			const id = c.req.param("id");
			if (!id) return null;

			return cacheKeys.http.static.clientMediaSingle(
				id,
				c.get("tenant")?.key ?? null,
			);
		},
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = createServiceContext(c);

		const media = await serviceWrapper(mediaServices.client.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.media.fetch.error.name"),
				message: copy("server:core.routes.media.fetch.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
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

export default getSingleController;
