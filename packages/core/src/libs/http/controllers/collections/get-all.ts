import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/collections.js";
import { collectionServices } from "../../../../services/index.js";
import T from "../../../../translations/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import { honoOpenAPIResponse } from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import formatAPIResponse from "../../utils/build-response.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all the config for all collection instances.",
		tags: ["collections"],
		summary: "Get All Collections",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	}),
	authenticate,
	async (c) => {
		const collectionsRes = await serviceWrapper(collectionServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_collection_fetch_error_name"),
				message: T("route_collection_fetch_error_message"),
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
				includeDocumentId: true,
			},
		);
		if (collectionsRes.error) throw new LucidAPIError(collectionsRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: collectionsRes.data,
			}),
		);
	},
);

export default getAllController;
