import { createFactory } from "hono/factory";
import type { LucidHonoContext } from "../../../../types/hono.js";
import { handleMcpRequest } from "../../../mcp/handle-request.js";
import { externalScopeCheck } from "../../middleware/external-scopes.js";
import createServiceContext from "../../utils/create-service-context.js";

const factory = createFactory();

const handleMcpController = factory.createHandlers((c: LucidHonoContext) =>
	handleMcpRequest({
		request: c.req.raw,
		context: createServiceContext(c),
		authority: c.get("externalAuth"),
		requireScopes: (scopes) =>
			externalScopeCheck(c, scopes, { resource: "mcp" }),
	}),
);

export default handleMcpController;
