import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/collections.js";
import { collectionServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import hasAccess from "../../../permission/has-access.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description: "Returns all the config for all collection instances.",
		tags: ["collections"],
		summary: "Get All Collections",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	}),
	authenticate(),
	async (c) => {
		const context = createServiceContext(c);
		const collectionsRes = await serviceWrapper(collectionServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.collection.fetch.error.name"),
				message: copy("server:core.routes.collection.fetch.error.message"),
			},
		})(context, {
			includeDocumentId: true,
			includeFields: c.req.query("include")?.split(",").includes("fields"),
		});
		if (collectionsRes.error) throw new LucidAPIError(collectionsRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: collectionsRes.data.filter((collection) =>
					hasAccess({
						user: c.get("auth"),
						requiredPermissions: [collection.permissions.read],
					}),
				),
			}),
		);
	},
);

export default getAllController;
