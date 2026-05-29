import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/collections.js";
import { collectionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import {
	honoOpenAPIParamaters,
	honoOpenAPIResponse,
} from "../../../../utils/open-api/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { text } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import collectionPermissions from "../../middleware/collection-permissions.js";
import validate from "../../middleware/validate.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

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
	collectionPermissions("read"),
	async (c) => {
		const { key } = c.req.valid("param");
		const context = createServiceContext(c);

		const collectionRes = await serviceWrapper(collectionServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: text.server("core.routes.collection.fetch.error.name"),
				message: text.server("core.routes.collection.fetch.error.message"),
			},
		})(context, {
			key,
		});
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
