import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getCSRFController from "../../../controllers/auth/get-csrf.js";
import getStatusController from "../../../controllers/auth/get-status.js";
import acceptInvitationController from "../../../controllers/auth/invitation/accept-invitation.js";
import validateInvitationController from "../../../controllers/auth/invitation/validate-invitation.js";
import loginController from "../../../controllers/auth/login.js";
import logoutController from "../../../controllers/auth/logout.js";
import magicLinkLoginController from "../../../controllers/auth/magic-link/login.js";
import sendMagicLinkController from "../../../controllers/auth/magic-link/send.js";
import validateMagicLinkController from "../../../controllers/auth/magic-link/validate.js";
import providerCallbackController from "../../../controllers/auth/providers/callback.js";
import getProvidersController from "../../../controllers/auth/providers/get-providers.js";
import initiateProviderontroller from "../../../controllers/auth/providers/initiate.js";
import setupRequiredController from "../../../controllers/auth/setup-required.js";
import setupController from "../../../controllers/auth/setup.js";
import tokenController from "../../../controllers/auth/token.js";

const authRoutes = new Hono<LucidHonoGeneric>()
	.get("/csrf", ...getCSRFController)
	.get("/status", ...getStatusController)
	.get("/setup-required", ...setupRequiredController)
	.get("/providers", ...getProvidersController)
	.get("/invitation/validate/:token", ...validateInvitationController)
	.get("/magic-link/validate/:token", ...validateMagicLinkController)
	.get("/providers/:providerKey/callback", ...providerCallbackController)
	.post("/setup", ...setupController)
	.post("/login", ...loginController)
	.post("/logout", ...logoutController)
	.post("/magic-link", ...sendMagicLinkController)
	.post("/magic-link/login", ...magicLinkLoginController)
	.post("/token", ...tokenController)
	.post("/invitation/accept/:token", ...acceptInvitationController)
	.post("/providers/:providerKey/initiate", ...initiateProviderontroller);

export default authRoutes;
