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
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const createMemoryController = factory.createHandlers(
	describeRoute({
		description:
			"Adds an agent memory. Shared memories need the manage shared memories permission.",
		tags: ["agent"],
		summary: "Create Agent Memory",
		responses: openAPI.responses({
			status: 201,
			dataSchema: z.toJSONSchema(controllerSchemas.createMemory.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.createMemory.body),
		parameters: openAPI.parameters({ headers: { csrf: true } }),
	}),
	validateCSRF(),
	authenticate(),
	agentAccess(),
	validate("json", controllerSchemas.createMemory.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const memory = await serviceWrapper(agentServices.saveMemory, {
			transaction: true,
			defaultError: {
				type: "basic",
				name: copy("server:core.routes.agent.error.name"),
				message: copy("server:core.routes.agent.error.message"),
			},
		})(context, {
			userId: c.get("auth").id,
			scope: body.scope,
			content: body.content,
			replaces: [],
		});
		if (memory.error) throw new LucidAPIError(memory.error);

		c.status(201);

		return c.json(formatAPIResponse(c, { data: memory.data }));
	},
);

export default createMemoryController;
