import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import getAccessibleRun from "../../../../services/agent/helpers/get-accessible-run.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";
import { streamRun } from "./helpers/stream-events.js";

const factory = createFactory();

const respondRunController = factory.createHandlers(
	describeRoute({
		description:
			"Submits or cancels a run's pending input request and streams the rest of its response.",
		tags: ["agent"],
		summary: "Respond To Agent Run",
		requestBody: openAPI.requestBody(controllerSchemas.respondRun.body),
		parameters: openAPI.parameters({
			params: controllerSchemas.respondRun.params,
			headers: { csrf: true },
		}),
	}),
	validateCSRF,
	authenticate(),
	agentAccess(true),
	validate("param", controllerSchemas.respondRun.params),
	validate("json", controllerSchemas.respondRun.body),
	async (c) => {
		const context = createServiceContext(c);
		const body = c.req.valid("json");

		const run = await getAccessibleRun(context, {
			runId: c.req.valid("param").id,
			userId: c.get("auth").id,
		});
		if (run.error) throw new LucidAPIError(run.error);

		return streamRun(c, context, {
			runId: run.data.id,
			answer: {
				interactionId: body.interactionId,
				response: body.response,
				action: body.action,
				userId: c.get("auth").id,
			},
		});
	},
);

export default respondRunController;
