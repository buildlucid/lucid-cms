import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent.js";
import { agentServices } from "../../../../services/index.js";
import { LucidError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const getSubagentsController = factory.createHandlers(
	openAPI.describeRoute(() => ({
		description:
			"Returns a conversation's parent and sub-agents with their latest runs and any confirmation a sub-agent waits on. For a sub-agent conversation, returns its parent and siblings.",
		tags: ["agent"],
		summary: "Get Agent Sub-agents",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.getSubagents.response),
		}),
		parameters: openAPI.parameters({
			params: controllerSchemas.getSubagents.params,
		}),
	})),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.getSubagents.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const subagents = await serviceWrapper(agentServices.getSubagents, {
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
		if (subagents.error) throw new LucidError(subagents.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: subagents.data }));
	},
);

export default getSubagentsController;
