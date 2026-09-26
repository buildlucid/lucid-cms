import { createMiddleware } from "hono/factory";
import resolveAgentAccess from "../../../services/agent/helpers/resolve-agent-access.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import createServiceContext from "../utils/create-service-context.js";

/** Checks the user can reach at least one agent. Services check access to the agent a request targets. */
const agentAccess = (requireConnection = false) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const context = createServiceContext(c);

		const result = await resolveAgentAccess(context, {
			userId: c.get("auth").id,
			requireConnection,
		});
		if (result.error) throw new LucidAPIError(result.error);

		return next();
	});
export default agentAccess;
