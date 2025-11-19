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
import buildFormattedQuery from "../../utils/build-formatted-query.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const getMultipleController = factory.createHandlers(
	describeRoute({
		description: "Get multiple media share links for a media item.",
		tags: ["media-share-links"],
		summary: "Get Media Share Links",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getMultiple.params,
			query: controllerSchemas.getMultiple.query.string,
		}),
		validateResponse: true,
	}),
	authenticate,
	validate("param", controllerSchemas.getMultiple.params),
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const { id } = c.req.valid("param");
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
		);

		const linksRes = await serviceWrapper(mediaShareLinkServices.getMultiple, {
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
				query: formattedQuery,
			},
		);
		if (linksRes.error) throw new LucidAPIError(linksRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: linksRes.data.data,
				pagination: {
					count: linksRes.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
