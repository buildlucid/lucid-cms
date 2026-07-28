import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import createSingle from "../../../controllers/integrations/create-single.js";
import deleteSingle from "../../../controllers/integrations/delete-single.js";
import getAll from "../../../controllers/integrations/get-all.js";
import getScopes from "../../../controllers/integrations/get-scopes.js";
import getSingle from "../../../controllers/integrations/get-single.js";
import regenerateKeys from "../../../controllers/integrations/regenerate-keys.js";
import updateSingle from "../../../controllers/integrations/update-single.js";
import completeAuthorization from "../../../controllers/oauth/complete-authorization.js";
import getAuthorizationRequest from "../../../controllers/oauth/get-authorization-request.js";
import getSystemConnections from "../../../controllers/oauth/get-system-connections.js";
import revokeConnection from "../../../controllers/oauth/revoke-connection.js";
import updateConnection from "../../../controllers/oauth/update-connection.js";

const integrationRoutes = new Hono<LucidHonoGeneric>()
	.get("/scopes", ...getScopes)
	.get("/oauth", ...getSystemConnections)
	.get("/oauth/authorization/:requestId", ...getAuthorizationRequest)
	.post("/oauth/authorization/:requestId", ...completeAuthorization)
	.patch("/oauth/:id", ...updateConnection)
	.delete("/oauth/:id", ...revokeConnection)
	.post("/", ...createSingle)
	.get("/", ...getAll)
	.post("/:id/regenerate-keys", ...regenerateKeys)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle);

export default integrationRoutes;
