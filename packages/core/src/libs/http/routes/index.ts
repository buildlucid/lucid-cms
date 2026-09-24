import { Hono } from "hono";
import constants from "../../../constants/constants.js";
import type { LucidHonoGeneric } from "../../../types/hono.js";
import healthController from "../controllers/health/index.js";
import authorizationServerMetadataController from "../controllers/oauth/authorization-server-metadata.js";
import contentProtectedResourceMetadataController from "../controllers/oauth/content-protected-resource-metadata.js";
import mcpProtectedResourceMetadataController from "../controllers/oauth/mcp-protected-resource-metadata.js";
import apiRoutes from "./api/v1/index.js";
import cdnRoutes from "./cdn/index.js";
import mcpRoutes from "./mcp/index.js";
import oauthRoutes from "./oauth/index.js";

const routes = new Hono<LucidHonoGeneric>()
	.get(
		"/.well-known/oauth-authorization-server/lucid",
		...authorizationServerMetadataController,
	)
	.get(
		"/lucid/.well-known/oauth-authorization-server",
		...authorizationServerMetadataController,
	)
	.get(
		"/.well-known/oauth-protected-resource/lucid/api/v1/content",
		...contentProtectedResourceMetadataController,
	)
	.get(
		"/lucid/api/v1/content/.well-known/oauth-protected-resource",
		...contentProtectedResourceMetadataController,
	)
	.get(
		"/.well-known/oauth-protected-resource/lucid/mcp",
		...mcpProtectedResourceMetadataController,
	)
	.get(
		"/lucid/mcp/.well-known/oauth-protected-resource",
		...mcpProtectedResourceMetadataController,
	)
	.route("/lucid/oauth", oauthRoutes)
	.route("/lucid/mcp", mcpRoutes)
	.get(`/${constants.directories.base}/health`, ...healthController)
	.route(`/${constants.directories.base}/api/v1`, apiRoutes)
	.route(`/${constants.directories.base}/cdn`, cdnRoutes);

export default routes;
