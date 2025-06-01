import { Hono } from "hono";
import loginController from "../../../controllers/auth/login.js";
import type { LucidHonoContext } from "../../../../../types/hono.js";

const authRoutes = new Hono<LucidHonoContext>().post(
	"/login",
	...loginController,
);

export default authRoutes;
