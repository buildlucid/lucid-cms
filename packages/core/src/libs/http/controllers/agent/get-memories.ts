import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent-memories.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getMemoriesController = factory.createHandlers(
	describeRoute({
		description:
			"Returns the authenticated user's personal agent memories and the shared ones, with each scope's limit.",
		tags: ["agent"],
		summary: "Get Agent Memories",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getMemories.response),
		}),
	}),
	authenticate(),
	agentAccess(),
	async (c) => {
		const context = createServiceContext(c);

		const memories = await serviceWrapper(agentServices.getMemories, {
			transaction: false,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.agent.error.name"),
				message: copy("server:core.routes.agent.error.message"),
			},
		})(context, { userId: c.get("auth").id });
		if (memories.error) throw new LucidAPIError(memories.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: memories.data }));
	},
);

export default getMemoriesController;
