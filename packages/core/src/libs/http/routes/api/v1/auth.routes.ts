import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getCSRFController from "../../../controllers/auth/get-csrf.js";
import getStatusController from "../../../controllers/auth/get-status.js";
import acceptInvitationController from "../../../controllers/auth/invitation/accept-invitation.js";
import acceptInvitationPasskeyController from "../../../controllers/auth/invitation/accept-passkey.js";
import invitationPasskeyOptionsController from "../../../controllers/auth/invitation/passkey-options.js";
import validateInvitationController from "../../../controllers/auth/invitation/validate-invitation.js";
import loginController from "../../../controllers/auth/login.js";
import logoutController from "../../../controllers/auth/logout.js";
import magicLinkLoginController from "../../../controllers/auth/magic-link/login.js";
import sendMagicLinkController from "../../../controllers/auth/magic-link/send.js";
import validateMagicLinkController from "../../../controllers/auth/magic-link/validate.js";
import passkeyLoginController from "../../../controllers/auth/passkeys/login.js";
import passkeyLoginOptionsController from "../../../controllers/auth/passkeys/options.js";
import providerCallbackController from "../../../controllers/auth/providers/callback.js";
import getProvidersController from "../../../controllers/auth/providers/get-providers.js";
import initiateProviderontroller from "../../../controllers/auth/providers/initiate.js";
import setupRequiredController from "../../../controllers/auth/setup-required.js";
import setupController from "../../../controllers/auth/setup.js";
import tokenController from "../../../controllers/auth/token.js";
import confirmTwoFactorChallengeController from "../../../controllers/auth/two-factor/confirm.js";
import getTwoFactorChallengeController from "../../../controllers/auth/two-factor/get-challenge.js";
import passkeyTwoFactorConfirmController from "../../../controllers/auth/two-factor/passkey-confirm.js";
import passkeyTwoFactorOptionsController from "../../../controllers/auth/two-factor/passkey-options.js";
import passkeyTwoFactorSetupController from "../../../controllers/auth/two-factor/passkey-setup.js";
import passkeyTwoFactorVerifyController from "../../../controllers/auth/two-factor/passkey-verify.js";
import setupTwoFactorChallengeController from "../../../controllers/auth/two-factor/setup.js";
import verifyTwoFactorChallengeController from "../../../controllers/auth/two-factor/verify.js";

const authRoutes = new Hono<LucidHonoGeneric>()
	.get("/csrf", ...getCSRFController)
	.get("/status", ...getStatusController)
	.get("/setup-required", ...setupRequiredController)
	.get("/providers", ...getProvidersController)
	.get("/invitation/validate/:token", ...validateInvitationController)
	.get("/magic-link/validate/:token", ...validateMagicLinkController)
	.get("/providers/:providerKey/callback", ...providerCallbackController)
	.get("/two-factor", ...getTwoFactorChallengeController)
	.post("/setup", ...setupController)
	.post("/login", ...loginController)
	.post("/logout", ...logoutController)
	.post("/magic-link", ...sendMagicLinkController)
	.post("/magic-link/login", ...magicLinkLoginController)
	.post("/passkey/options", ...passkeyLoginOptionsController)
	.post("/passkey/login", ...passkeyLoginController)
	.post("/token", ...tokenController)
	.post("/two-factor/verify", ...verifyTwoFactorChallengeController)
	.post("/two-factor/setup", ...setupTwoFactorChallengeController)
	.post("/two-factor/confirm", ...confirmTwoFactorChallengeController)
	.post("/two-factor/passkey/options", ...passkeyTwoFactorOptionsController)
	.post("/two-factor/passkey/verify", ...passkeyTwoFactorVerifyController)
	.post("/two-factor/passkey/setup", ...passkeyTwoFactorSetupController)
	.post("/two-factor/passkey/confirm", ...passkeyTwoFactorConfirmController)
	.post("/invitation/accept/:token", ...acceptInvitationController)
	.post(
		"/invitation/accept/:token/passkey/options",
		...invitationPasskeyOptionsController,
	)
	.post(
		"/invitation/accept/:token/passkey",
		...acceptInvitationPasskeyController,
	)
	.post("/providers/:providerKey/initiate", ...initiateProviderontroller);

export default authRoutes;
