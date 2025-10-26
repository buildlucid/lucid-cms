import { Hono } from "hono";
import loginController from "../../../controllers/auth/login.js";
import getCSRFController from "../../../controllers/auth/get-csrf.js";
import logoutController from "../../../controllers/auth/logout.js";
import tokenController from "../../../controllers/auth/token.js";
import setupRequiredController from "../../../controllers/auth/setup-required.js";
import setupController from "../../../controllers/auth/setup.js";
import getProvidersController from "../../../controllers/auth/get-providers.js";
import validateInvitationController from "../../../controllers/auth/validate-invitation.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const authRoutes = new Hono<LucidHonoGeneric>()
	.get("/csrf", ...getCSRFController)
	.get("/setup-required", ...setupRequiredController)
	.get("/providers", ...getProvidersController)
	.get("/invitation/validate/:token", ...validateInvitationController)
	.post("/setup", ...setupController)
	.post("/login", ...loginController)
	.post("/logout", ...logoutController)
	.post("/token", ...tokenController);

export default authRoutes;
