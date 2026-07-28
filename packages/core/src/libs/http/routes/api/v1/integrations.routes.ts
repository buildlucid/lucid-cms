import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import createSingle from "../../../controllers/api-integrations/create-single.js";
import deleteSingle from "../../../controllers/api-integrations/delete-single.js";
import getAll from "../../../controllers/api-integrations/get-all.js";
import getScopes from "../../../controllers/api-integrations/get-scopes.js";
import getSingle from "../../../controllers/api-integrations/get-single.js";
import regenerateKeys from "../../../controllers/api-integrations/regenerate-keys.js";
import updateSingle from "../../../controllers/api-integrations/update-single.js";
import completeAuthorization from "../../../controllers/oauth/complete-authorization.js";
import getAuthorizationRequest from "../../../controllers/oauth/get-authorization-request.js";
import getSystemConnections from "../../../controllers/oauth/get-system-connections.js";
import revokeConnection from "../../../controllers/oauth/revoke-connection.js";
import updateConnection from "../../../controllers/oauth/update-connection.js";

const apiIntegrationRoutes = new Hono<LucidHonoGeneric>()
	.post("/", ...createSingle)
	.get("/", ...getAll)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle)
	.post("/:id/regenerate-keys", ...regenerateKeys);

const integrationRoutes = new Hono<LucidHonoGeneric>()
	.get("/scopes", ...getScopes)
	.get("/oauth", ...getSystemConnections)
	.get("/oauth/authorization/:requestId", ...getAuthorizationRequest)
	.post("/oauth/authorization/:requestId", ...completeAuthorization)
	.patch("/oauth/:id", ...updateConnection)
	.delete("/oauth/:id", ...revokeConnection)
	.route("/api", apiIntegrationRoutes);

export default integrationRoutes;
