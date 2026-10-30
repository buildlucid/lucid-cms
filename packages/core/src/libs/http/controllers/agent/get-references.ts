import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getReferencesController = factory.createHandlers(
	describeRoute({
		description:
			"Returns current details for media and documents linked to this chat.",
		tags: ["agent"],
		summary: "Get Agent References",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getReferences.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getReferences.params,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getReferences.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const details = await serviceWrapper(agentServices.getReferences, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.agent.error.name"),
				message: copy("server:core.routes.agent.error.message"),
			},
		})(context, {
			id: param.id,
			userId: c.get("auth").id,
		});
		if (details.error) throw new LucidAPIError(details.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: details.data }));
	},
);

export default getReferencesController;
