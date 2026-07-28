import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../../schemas/integrations.js";
import { integrationServices } from "../../../../../services/index.js";
import { LucidAPIError } from "../../../../../utils/errors/index.js";
import serviceWrapper from "../../../../../utils/services/service-wrapper.js";
import { copy } from "../../../../i18n/index.js";
import authenticate from "../../../middleware/authenticate.js";
import validate from "../../../middleware/validate.js";
import openAPI from "../../../openapi/index.js";
import formatAPIResponse from "../../../utils/build-response.js";
import createServiceContext from "../../../utils/create-service-context.js";

const factory = createFactory();

const getSingleController = factory.createHandlers(
	describeRoute({
		description: "Returns an API key integration owned by the current user.",
		tags: ["integrations"],
		summary: "Get Account Integration",
		responses: openAPI.responses({
			schema: z.toJSONSchema(controllerSchemas.getSingle.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getSingle.params,
		}),
	}),
	authenticate(),
	validate("param", controllerSchemas.getSingle.params),
	async (c) => {
		const { id } = c.req.valid("param");
		const auth = c.get("auth");
		const context = createServiceContext(c);

		const getSingleRes = await serviceWrapper(integrationServices.getSingle, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.integrations.fetch.error.name"),
				message: copy("server:core.routes.integrations.fetch.error.message"),
			},
		})(context, {
			id: Number.parseInt(id, 10),
			userId: auth.id,
		});
		if (getSingleRes.error) throw new LucidAPIError(getSingleRes.error);

		c.status(200);
		return c.json(
			formatAPIResponse(c, {
				data: getSingleRes.data,
			}),
		);
	},
);

export default getSingleController;
