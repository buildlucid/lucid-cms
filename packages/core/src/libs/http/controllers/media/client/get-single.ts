import { minutesToSeconds } from "date-fns";
import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { mediaServices } from "../../../../../services/index.js";
import T from "../../../../../translations/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import cacheKeys from "../../../../kv-adapter/cache-keys.js";
import { ClientScopes } from "../../../../permission/client-scopes.js";
import cache from "../../../middleware/cache.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import clientScopes from "../../../middleware/client-scopes.js";
import validate from "../../../middleware/validate.js";
import formatAPIResponse from "../../../utils/build-response.js";
import getServiceContext from "../../../utils/get-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description:
			"Get a single media item by ID via the client integration. Returns translated metadata.",
		tags: ["client-media"],
		summary: "Get Media",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
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
		staticKey: (c) =>
			cacheKeys.http.static.clientMediaSingle(c.req.param("id")),
	}),
	async (c) => {
		const { id } = c.req.valid("param");
		const context = getServiceContext(c);

		const media = await serviceWrapper(mediaServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_fetch_error_name"),
				message: T("route_media_fetch_error_message"),
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
