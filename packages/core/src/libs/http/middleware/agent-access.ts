import { createMiddleware } from "hono/factory";
import checkAgentAccess from "../../../services/agent/helpers/check-agent-access.js";
import type { LucidHonoContext } from "../../../types/hono.js";
import { LucidAPIError } from "../../../utils/errors/index.js";
import createServiceContext from "../utils/create-service-context.js";

/** Checks current AI availability and the user's live authority for agent routes. */
const agentAccess = (requireConnection = false) =>
	createMiddleware(async (c: LucidHonoContext, next) => {
		const context = createServiceContext(c);

		const result = await checkAgentAccess(context, {
			userId: c.get("auth").id,
			requireConnection,
		});
		if (result.error) throw new LucidAPIError(result.error);

		return next();
	});
export default agentAccess;
