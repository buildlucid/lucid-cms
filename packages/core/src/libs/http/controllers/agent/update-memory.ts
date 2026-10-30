import { describeRoute } from "hono-openapi";
import { createFactory } from "hono/factory";
import z from "zod";
import { controllerSchemas } from "../../../../schemas/agent-memories.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import { copy } from "../../../i18n/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import formatAPIResponse from "../../utils/build-response.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const updateMemoryController = factory.createHandlers(
	describeRoute({
		description:
			"Changes an agent memory's text or scope. Shared memories need the manage shared memories permission.",
		tags: ["agent"],
		summary: "Update Agent Memory",
		responses: openAPI.responses({
			dataSchema: z.toJSONSchema(controllerSchemas.updateMemory.response),
		}),
		requestBody: openAPI.requestBody(controllerSchemas.updateMemory.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.updateMemory.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF(),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.updateMemory.params),
	validate("json", controllerSchemas.updateMemory.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");
		const param = c.req.valid("param");

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
			replaces: [param.id],
		});
		if (memory.error) throw new LucidAPIError(memory.error);

		c.status(200);

		return c.json(formatAPIResponse(c, { data: memory.data }));
	},
);

export default updateMemoryController;
