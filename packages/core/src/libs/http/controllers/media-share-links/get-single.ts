import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod/v4";
import { controllerSchemas } from "../../../../schemas/media-share-links.js";
import { mediaShareLinkServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Get a single media share link for a media item.",
		tags: ["media-share-links"],
		summary: "Get Media Share Link",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
		}),
		validateResponse: true,
	}),
	authenticate,
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id, linkId } = c.req.valid("param");

		const linksRes = await serviceWrapper(mediaShareLinkServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_share_links_fetch_error_name"),
				message: T("route_media_share_links_fetch_error_message"),
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
				mediaId: Number.parseInt(id, 10),
				linkId: Number.parseInt(linkId, 10),
			},
		);
		if (linksRes.error) throw new LucidAPIError(linksRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: linksRes.data,
			}),
		);
	},
);

export default getSingleController;
