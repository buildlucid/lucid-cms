import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getUserOAuthConnections from "../../../controllers/oauth/get-user-connections.js";
import revokeUserOAuthConnection from "../../../controllers/oauth/revoke-connection.js";
import updateUserOAuthConnection from "../../../controllers/oauth/update-connection.js";
import getMultipleLogins from "../../../controllers/user-logins/get-multiple.js";
import createProfilePictureUploadSession from "../../../controllers/users/create-profile-picture-upload-session.js";
import deleteMultiplePermanently from "../../../controllers/users/delete-multiple-permanently.js";
import deleteProfilePicture from "../../../controllers/users/delete-profile-picture.js";
import deleteSingle from "../../../controllers/users/delete-single.js";
import deleteSinglePermanently from "../../../controllers/users/delete-single-permanently.js";
import getMultiple from "../../../controllers/users/get-multiple.js";
import getSingle from "../../../controllers/users/get-single.js";
import createUserIntegration from "../../../controllers/users/integrations/create-single.js";
import deleteUserIntegration from "../../../controllers/users/integrations/delete-single.js";
import getUserIntegrations from "../../../controllers/users/integrations/get-all.js";
import getUserIntegrationScopes from "../../../controllers/users/integrations/get-scopes.js";
import getUserIntegration from "../../../controllers/users/integrations/get-single.js";
import regenerateUserIntegrationKey from "../../../controllers/users/integrations/regenerate-keys.js";
import updateUserIntegration from "../../../controllers/users/integrations/update-single.js";
import inviteSingle from "../../../controllers/users/invite-single.js";
import resendInvitation from "../../../controllers/users/resend-invitation.js";
import restoreMultiple from "../../../controllers/users/restore-multiple.js";
import revokeRefreshTokens from "../../../controllers/users/revoke-refresh-tokens.js";
import unlinkAuthProvider from "../../../controllers/users/unlink-auth-provider.js";
import updateProfilePicture from "../../../controllers/users/update-profile-picture.js";
import updateSingle from "../../../controllers/users/update-single.js";

const usersRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/logins/:id", ...getMultipleLogins)
	.get("/:userId/oauth-connections", ...getUserOAuthConnections)
	.get("/:userId/integrations/scopes", ...getUserIntegrationScopes)
	.get("/:userId/integrations", ...getUserIntegrations)
	.post("/:userId/integrations", ...createUserIntegration)
	.post(
		"/:userId/integrations/:id/regenerate-keys",
		...regenerateUserIntegrationKey,
	)
	.get("/:userId/integrations/:id", ...getUserIntegration)
	.patch("/:userId/integrations/:id", ...updateUserIntegration)
	.delete("/:userId/integrations/:id", ...deleteUserIntegration)
	.get("/:id", ...getSingle)
	.post(
		"/:id/profile-picture/upload-session",
		...createProfilePictureUploadSession,
	)
	.post("/:id/profile-picture", ...updateProfilePicture)
	.post("/:id/resend-invitation", ...resendInvitation)
	.post("/:id/revoke-refresh-tokens", ...revokeRefreshTokens)
	.post("/", ...inviteSingle)
	.post("/restore", ...restoreMultiple)
	.delete("/:id/auth-providers/:providerId", ...unlinkAuthProvider)
	.delete("/:userId/oauth-connections/:id", ...revokeUserOAuthConnection)
	.delete("/:id/profile-picture", ...deleteProfilePicture)
	.delete("/permanent", ...deleteMultiplePermanently)
	.delete("/:id/permanent", ...deleteSinglePermanently)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle)
	.patch("/:userId/oauth-connections/:id", ...updateUserOAuthConnection);

export default usersRoutes;
