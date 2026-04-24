import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import deleteProfilePictureController from "../../../controllers/account/delete-profile-picture.js";
import getMeController from "../../../controllers/account/get-me.js";
import getProfilePicturePresignedUrlController from "../../../controllers/account/get-profile-picture-presigned-url.js";
import resetPasswordController from "../../../controllers/account/reset-password.js";
import revokeRefreshTokensController from "../../../controllers/account/revoke-refresh-tokens.js";
import sendResetPasswordController from "../../../controllers/account/send-reset-password.js";
import unlinkAuthProviderController from "../../../controllers/account/unlink-auth-provider.js";
import updateMeController from "../../../controllers/account/update-me.js";
import updateProfilePictureController from "../../../controllers/account/update-profile-picture.js";
import verifyResetPasswordController from "../../../controllers/account/verify-reset-password.js";

const accountRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMeController)
	.patch("/", ...updateMeController)
	.post(
		"/profile-picture/presigned-url",
		...getProfilePicturePresignedUrlController,
	)
	.post("/profile-picture", ...updateProfilePictureController)
	.patch("/reset-password/:token", ...resetPasswordController)
	.post("/reset-password", ...sendResetPasswordController)
	.post("/revoke-refresh-tokens", ...revokeRefreshTokensController)
	.get("/reset-password/:token", ...verifyResetPasswordController)
	.delete("/auth-providers/:providerId", ...unlinkAuthProviderController)
	.delete("/profile-picture", ...deleteProfilePictureController);

export default accountRoutes;
