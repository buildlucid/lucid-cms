import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import createSingle from "../../../controllers/integrations/create-single.js";
import deleteSingle from "../../../controllers/integrations/delete-single.js";
import getAll from "../../../controllers/integrations/get-all.js";
import getScopes from "../../../controllers/integrations/get-scopes.js";
import getSingle from "../../../controllers/integrations/get-single.js";
import createOAuthClientLogoUploadSession from "../../../controllers/integrations/oauth-clients/create-logo-upload-session.js";
import createOAuthClient from "../../../controllers/integrations/oauth-clients/create-single.js";
import deleteOAuthClient from "../../../controllers/integrations/oauth-clients/delete-single.js";
import getOAuthClients from "../../../controllers/integrations/oauth-clients/get-all.js";
import getOAuthClient from "../../../controllers/integrations/oauth-clients/get-single.js";
import regenerateOAuthClientSecret from "../../../controllers/integrations/oauth-clients/regenerate-secret.js";
import updateOAuthClientLogoUploadSession from "../../../controllers/integrations/oauth-clients/update-logo-upload-session.js";
import updateOAuthClient from "../../../controllers/integrations/oauth-clients/update-single.js";
import regenerateKeys from "../../../controllers/integrations/regenerate-keys.js";
import updateSingle from "../../../controllers/integrations/update-single.js";
import completeAuthorization from "../../../controllers/oauth/complete-authorization.js";
import getAuthorizationRequest from "../../../controllers/oauth/get-authorization-request.js";
import getSystemConnections from "../../../controllers/oauth/get-system-connections.js";
import revokeConnection from "../../../controllers/oauth/revoke-connection.js";
import updateConnection from "../../../controllers/oauth/update-connection.js";

const integrationRoutes = new Hono<LucidHonoGeneric>()
	.get("/scopes", ...getScopes)
	.post(
		"/oauth-clients/logo/upload-session",
		...createOAuthClientLogoUploadSession,
	)
	.get("/oauth-clients", ...getOAuthClients)
	.post("/oauth-clients", ...createOAuthClient)
	.post(
		"/oauth-clients/:id/logo/upload-session",
		...updateOAuthClientLogoUploadSession,
	)
	.post("/oauth-clients/:id/regenerate-secret", ...regenerateOAuthClientSecret)
	.get("/oauth-clients/:id", ...getOAuthClient)
	.patch("/oauth-clients/:id", ...updateOAuthClient)
	.delete("/oauth-clients/:id", ...deleteOAuthClient)
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
