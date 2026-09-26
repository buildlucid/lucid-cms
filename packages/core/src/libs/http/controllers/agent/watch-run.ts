import { createFactory } from "hono/factory";
import { describeRoute } from "hono-openapi";
import { controllerSchemas } from "../../../../schemas/agent.js";
import getAccessibleRun from "../../../../services/agent/helpers/get-accessible-run.js";
import { agentServices } from "../../../../services/index.js";
import { LucidAPIError } from "../../../../utils/errors/index.js";
import serviceWrapper from "../../../../utils/services/service-wrapper.js";
import agentAccess from "../../middleware/agent-access.js";
import authenticate from "../../middleware/authenticate.js";
import validate from "../../middleware/validate.js";
import openAPI from "../../openapi/index.js";
import createServiceContext from "../../utils/create-service-context.js";
import streamEvents from "./helpers/stream-events.js";

const factory = createFactory();

const watchRunController = factory.createHandlers(
	describeRoute({
		description:
			"Streams a run's saved replies as server-sent events while it executes in the background.",
		tags: ["agent"],
		summary: "Watch Agent Run",
		parameters: openAPI.parameters({
			params: controllerSchemas.watchRun.params,
		}),
	}),
	authenticate(),
	agentAccess(),
	validate("param", controllerSchemas.watchRun.params),
	async (c) => {
		const context = createServiceContext(c);
		const param = c.req.valid("param");

		const run = await getAccessibleRun(context, {
			runId: param.id,
			userId: c.get("auth").id,
		});
		if (run.error) throw new LucidAPIError(run.error);

		return streamEvents(c, (stream) =>
			serviceWrapper(agentServices.watchRun, {
				transaction: false,
			})(context, { runId: run.data.id, ...stream }),
		);
	},
);

export default watchRunController;
