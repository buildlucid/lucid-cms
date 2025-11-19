import z from "zod/v4";
import T from "../../../../../translations/index.js";
import { createFactory } from "hono/factory";
import { controllerSchemas } from "../../../../../schemas/media.js";
import { describeRoute } from "hono-openapi";
import { mediaServices } from "../../../../../services/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import {
	honoOpenAPIResponse,
	honoOpenAPIParamaters,
	honoOpenAPIRequestBody,
} from "../../../../../utils/open-api/index.js";
import clientAuthentication from "../../../middleware/client-authenticate.js";
import validate from "../../../middleware/validate.js";

const factory = createFactory();

const processMediaController = factory.createHandlers(
	describeRoute({
		description:
			"Get a single media item by key and return the URL. This supports processing and fallback images.",
		tags: ["client-media"],
		summary: "Get Media URL",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.client.processMedia.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.client.processMedia.params,
			headers: {
				authorization: true,
			},
		}),
		requestBody: honoOpenAPIRequestBody(
			controllerSchemas.client.processMedia.body,
		),
		validateResponse: true,
	}),
	clientAuthentication,
	validate("param", controllerSchemas.client.processMedia.params),
	validate("json", controllerSchemas.client.processMedia.body),
	async (c) => {
		const media = await serviceWrapper(mediaServices.processMedia, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: T("route_media_fetch_error_name"),
				message: T("route_media_fetch_error_message"),
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
				key: c.req.valid("param").key,
				body: c.req.valid("json"),
			},
		);
		if (media.error) throw new LucidAPIError(media.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: media.data,
			}),
		);
	},
);

export default processMediaController;
