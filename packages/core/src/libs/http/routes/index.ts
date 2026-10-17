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

const { api, mcp, cdn } = constants.paths;

const routes = new Hono<LucidHonoGeneric>()
	.get(
		"/.well-known/oauth-authorization-server",
		...authorizationServerMetadataController,
	)
	.get(
		`/.well-known/oauth-protected-resource${api}/v1/content`,
		...contentProtectedResourceMetadataController,
	)
	.get(
		`${api}/v1/content/.well-known/oauth-protected-resource`,
		...contentProtectedResourceMetadataController,
	)
	.get(
		`/.well-known/oauth-protected-resource${mcp}`,
		...mcpProtectedResourceMetadataController,
	)
	.get(
		`${mcp}/.well-known/oauth-protected-resource`,
		...mcpProtectedResourceMetadataController,
	)
	.route(`${api}/oauth`, oauthRoutes)
	.route(mcp, mcpRoutes)
	.get(`${api}/health`, ...healthController)
	.route(`${api}/v1`, apiRoutes)
	.route(cdn, cdnRoutes);

export default routes;
