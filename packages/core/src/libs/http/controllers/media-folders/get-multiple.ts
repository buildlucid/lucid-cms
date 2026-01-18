import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/media-folders.js";
import { mediaFolderServices } from "../../../../services/index.js";
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
		description: "Get multiple media folders.",
		tags: ["media-folders"],
		summary: "Get Multiple Media Folders",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getMultiple.response),
			paginated: true,
		}),
		parameters: honoOpenAPIParamaters({
			query: controllerSchemas.getMultiple.query.string,
		}),
	}),
	authenticate,
	validate("query", controllerSchemas.getMultiple.query.string),
	async (c) => {
		const formattedQuery = await buildFormattedQuery(
			c,
			controllerSchemas.getMultiple.query.formatted,
			{
				nullableFields: ["parentFolderId"],
			},
		);

		const folders = await serviceWrapper(mediaFolderServices.getMultiple, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_media_folders_fetch_error_name"),
				message: T("route_media_folders_fetch_error_message"),
			},
		})(
			{
				db: c.get("config").db,
				config: c.get("config"),
				queue: c.get("queue"),
				env: c.get("env"),
				kv: c.get("kv"),
			},
			{
				query: formattedQuery,
			},
		);
		if (folders.error) throw new LucidAPIError(folders.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: folders.data.data,
				pagination: {
					count: folders.data.count,
					page: formattedQuery.page,
					perPage: formattedQuery.perPage,
				},
			}),
		);
	},
);

export default getMultipleController;
