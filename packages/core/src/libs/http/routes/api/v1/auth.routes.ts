import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getCSRFController from "../../../controllers/auth/get-csrf.js";
import acceptInvitationController from "../../../controllers/auth/invitation/accept-invitation.js";
import validateInvitationController from "../../../controllers/auth/invitation/validate-invitation.js";
import loginController from "../../../controllers/auth/login.js";
import logoutController from "../../../controllers/auth/logout.js";

import getProvidersController from "../../../controllers/auth/providers/get-providers.js";
import initiateProviderontroller from "../../../controllers/auth/providers/initiate.js";
import oidcCallbackController from "../../../controllers/auth/providers/oidc-callback.js";

import setupController from "../../../controllers/auth/setup.js";
import setupRequiredController from "../../../controllers/auth/setup-required.js";
import tokenController from "../../../controllers/auth/token.js";

const authRoutes = new Hono<LucidHonoGeneric>()
	.get("/csrf", ...getCSRFController)
	.get("/setup-required", ...setupRequiredController)
	.get("/providers", ...getProvidersController)
	.get("/invitation/validate/:token", ...validateInvitationController)
	.get("/providers/:providerKey/callback", ...oidcCallbackController)
	.post("/setup", ...setupController)
	.post("/login", ...loginController)
	.post("/logout", ...logoutController)
	.post("/token", ...tokenController)
	.post("/invitation/accept/:token", ...acceptInvitationController)
	.post("/providers/:providerKey/initiate", ...initiateProviderontroller);

export default authRoutes;
