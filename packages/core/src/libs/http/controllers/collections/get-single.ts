import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/collections.js";
import { collectionServices } from "../../../../services/index.js";
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
		description: "Get a single collection instance.",
		tags: ["collections"],
		summary: "Get Collection",
		responses: honoOpenAPIResponse({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: honoOpenAPIParamaters({
			params: controllerSchemas.getSingle.params,
		}),
	}),
	authenticate,
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { key } = c.req.valid("param");

		const collectionRes = await serviceWrapper(collectionServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: T("route_collection_fetch_error_name"),
				message: T("route_collection_fetch_error_message"),
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
				key,
			},
		);
		if (collectionRes.error) throw new LucidAPIError(collectionRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: collectionRes.data,
			}),
		);
	},
);

export default getSingleController;
