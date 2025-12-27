import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import status from "../../../controllers/license/status.js";
import update from "../../../controllers/license/update.js";
import verify from "../../../controllers/license/verify.js";

const licenseRoutes = new Hono<LucidHonoGeneric>()
	.patch("/", ...update)
	.post("/verify", ...verify)
	.get("/status", ...status);

export default licenseRoutes;
