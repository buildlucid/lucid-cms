import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getDefinitionsController = factory.createHandlers(
	describeRoute({
		description: "Returns enabled agents and their available chat details.",
		tags: ["agent"],
		summary: "Get Agent Definitions",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getDefinitions.response),
		}),
	}),
	authenticate(),
	async (c) => {
		const context = createServiceContext(c);

		const definitions = await serviceWrapper(agentServices.getDefinitions, {
			transaction: false,
		})(context, { authUser: c.get("auth") });
		if (definitions.error) throw new LucidAPIError(definitions.error);

		c.status(200);
		return c.json(formatAPIResponse(c, { data: definitions.data }));
	},
);

export default getDefinitionsController;
