import { Hono } from "hono";
import getMeController from "../../../controllers/account/get-me.js";
import resetPasswordController from "../../../controllers/account/reset-password.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const accountRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMeController)
	.patch("/reset-password/:token", ...resetPasswordController);

export default accountRoutes;
