import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/tenants.js";
import { tenantServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getAllController = factory.createHandlers(
	describeRoute({
		description:
			"Returns all tenants the authenticated user has access to. Empty when multi-tenancy is not enabled.",
		tags: ["tenants"],
		summary: "Get All Tenants",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getAll.response),
		}),
	}),
	authenticate({ tenantScope: "allow-global" }),
	async (c) => {
		const context = createServiceContext(c);

		const tenants = await serviceWrapper(tenantServices.getAll, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.tenants.fetch.error.name"),
				message: copy("server:core.routes.tenants.fetch.error.message"),
			},
		})(context, {
			authUser: c.get("auth"),
		});
		if (tenants.error) throw new LucidAPIError(tenants.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: tenants.data,
			}),
		);
	},
);

export default getAllController;
