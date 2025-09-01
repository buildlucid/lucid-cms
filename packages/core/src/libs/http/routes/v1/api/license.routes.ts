import { Hono } from "hono";
import update from "../../../controllers/license/update.js";
import verify from "../../../controllers/license/verify.js";
import status from "../../../controllers/license/status.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const licenseRoutes = new Hono<LucidHonoGeneric>()
	.patch("/", ...update)
	.post("/verify", ...verify)
	.get("/status", ...status);

export default licenseRoutes;
