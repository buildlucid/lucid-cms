import { Hono } from "hono";
import getMeController from "../../../controllers/account/get-me.js";
import resetPasswordController from "../../../controllers/account/reset-password.js";
import sendResetPasswordController from "../../../controllers/account/send-reset-password.js";
import updateMeController from "../../../controllers/account/update-me.js";
import verifyResetPasswordController from "../../../controllers/account/verify-reset-password.js";
import unlinkAuthProviderController from "../../../controllers/account/unlink-auth-provider.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const accountRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMeController)
	.patch("/", ...updateMeController)
	.patch("/reset-password/:token", ...resetPasswordController)
	.post("/reset-password", ...sendResetPasswordController)
	.get("/reset-password/:token", ...verifyResetPasswordController)
	.delete("/auth-providers/:providerId", ...unlinkAuthProviderController);

export default accountRoutes;
