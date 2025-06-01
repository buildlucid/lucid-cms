import { Hono } from "hono";
import loginController from "../../../controllers/auth/login.js";
import getCSRFController from "../../../controllers/auth/get-csrf.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const authRoutes = new Hono<LucidHonoGeneric>()
	.get("/csrf", ...getCSRFController)
	.post("/login", ...loginController);

export default authRoutes;
