import { createFactory } from "hono/factory";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { externalScopeCheck } from "../../middleware/external-scopes.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const handleMcpController = factory.createHandlers(
	async (c: LucidHonoContext) => {
		// Defer MCP SDK loading until first use.
		const { handleMcpRequest } = await import("../../../mcp/handle-request.js");

		return handleMcpRequest({
			request: c.req.raw,
			context: createServiceContext(c),
			authority: c.get("externalAuth"),
			requireScopes: (scopes) =>
				externalScopeCheck(c, scopes, { resource: "mcp" }),
		});
	},
);

export default handleMcpController;
