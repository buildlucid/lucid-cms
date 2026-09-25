import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import getOwnedRun from "../../../../services/agent/helpers/get-owned-run.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import validateCSRF from "../../middleware/validate-csrf.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";
import streamEvents from "./helpers/stream-events.js";

const factory = createFactory();

const respondRunController = factory.createHandlers(
	describeRoute({
		description:
			"Answers a run's pending question or approval and streams the rest of its response.",
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

		const run = await getOwnedRun(context, {
			runId: c.req.valid("param").id,
			userId: c.get("auth").id,
		});
		if (run.error) throw new LucidAPIError(run.error);

		return streamEvents(c, (stream) =>
			serviceWrapper(agentServices.executeRun, {
				transaction: false,
				logError: true,
			})(context, {
				runId: run.data.id,
				answer: c.req.valid("json"),
				...stream,
			}),
		);
	},
);

export default respondRunController;
