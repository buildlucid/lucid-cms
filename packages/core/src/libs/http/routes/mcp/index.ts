import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../types/hono.js";
import { ExternalScopes } from "../../../permission/external-scopes.js";
import handleMcpController from "../../controllers/mcp/handle.js";
import externalAuthentication from "../../middleware/external-authenticate.js";
import externalScopes from "../../middleware/external-scopes.js";
import mcpAccess from "../../middleware/mcp-access.js";

const mcpRoutes = new Hono<LucidHonoGeneric>()
	.use("*", mcpAccess)
	.use("*", externalAuthentication({ resource: "mcp" }))
	.use("*", externalScopes([ExternalScopes.McpAccess], { resource: "mcp" }))
	.all("/", ...handleMcpController);

export default mcpRoutes;
