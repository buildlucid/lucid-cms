import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import cancelEmailChangeController from "../../../controllers/account/cancel-email-change.js";
import confirmEmailChangeController from "../../../controllers/account/confirm-email-change.js";
import createProfilePictureUploadSessionController from "../../../controllers/account/create-profile-picture-upload-session.js";
import deleteProfilePictureController from "../../../controllers/account/delete-profile-picture.js";
import getMeController from "../../../controllers/account/get-me.js";
import resetPasswordController from "../../../controllers/account/reset-password.js";
import revertEmailChangeController from "../../../controllers/account/revert-email-change.js";
import revokeRefreshTokensController from "../../../controllers/account/revoke-refresh-tokens.js";
import sendResetPasswordController from "../../../controllers/account/send-reset-password.js";
import unlinkAuthProviderController from "../../../controllers/account/unlink-auth-provider.js";
import updateMeController from "../../../controllers/account/update-me.js";
import updateProfilePictureController from "../../../controllers/account/update-profile-picture.js";
import verifyEmailChangeConfirmController from "../../../controllers/account/verify-email-change-confirm.js";
import verifyEmailChangeRevertController from "../../../controllers/account/verify-email-change-revert.js";
import verifyResetPasswordController from "../../../controllers/account/verify-reset-password.js";
import createIntegration from "../../../controllers/integrations/account/create-single.js";
import deleteIntegration from "../../../controllers/integrations/account/delete-single.js";
import getIntegrations from "../../../controllers/integrations/account/get-all.js";
import getIntegrationScopes from "../../../controllers/integrations/account/get-scopes.js";
import getIntegration from "../../../controllers/integrations/account/get-single.js";
import regenerateIntegrationKey from "../../../controllers/integrations/account/regenerate-keys.js";
import updateIntegration from "../../../controllers/integrations/account/update-single.js";
import getAccountConnectionsController from "../../../controllers/oauth/get-account-connections.js";
import revokeOAuthConnectionController from "../../../controllers/oauth/revoke-connection.js";
import updateOAuthConnectionController from "../../../controllers/oauth/update-connection.js";

const accountRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMeController)
	.patch("/", ...updateMeController)
	.get("/oauth-connections", ...getAccountConnectionsController)
	.patch("/oauth-connections/:id", ...updateOAuthConnectionController)
	.delete("/oauth-connections/:id", ...revokeOAuthConnectionController)
	.get("/integrations/scopes", ...getIntegrationScopes)
	.get("/integrations", ...getIntegrations)
	.post("/integrations", ...createIntegration)
	.post("/integrations/:id/regenerate-keys", ...regenerateIntegrationKey)
	.get("/integrations/:id", ...getIntegration)
	.patch("/integrations/:id", ...updateIntegration)
	.delete("/integrations/:id", ...deleteIntegration)
	.get("/email-change/confirm/:token", ...verifyEmailChangeConfirmController)
	.patch("/email-change/confirm/:token", ...confirmEmailChangeController)
	.get("/email-change/revert/:token", ...verifyEmailChangeRevertController)
	.patch("/email-change/revert/:token", ...revertEmailChangeController)
	.delete("/email-change", ...cancelEmailChangeController)
	.post(
		"/profile-picture/upload-session",
		...createProfilePictureUploadSessionController,
	)
	.post("/profile-picture", ...updateProfilePictureController)
	.patch("/reset-password/:token", ...resetPasswordController)
	.post("/reset-password", ...sendResetPasswordController)
	.post("/revoke-refresh-tokens", ...revokeRefreshTokensController)
	.get("/reset-password/:token", ...verifyResetPasswordController)
	.delete("/auth-providers/:providerId", ...unlinkAuthProviderController)
	.delete("/profile-picture", ...deleteProfilePictureController);

export default accountRoutes;
