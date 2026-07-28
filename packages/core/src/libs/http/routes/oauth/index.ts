import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../types/hono.js";
import authorizeController from "../../controllers/oauth/authorize.js";
import revokeController from "../../controllers/oauth/revoke.js";
import tokenController from "../../controllers/oauth/token.js";

const oauthRoutes = new Hono<LucidHonoGeneric>()
	.get("/authorize", ...authorizeController)
	.post("/token", ...tokenController)
	.post("/revoke", ...revokeController);

export default oauthRoutes;
