import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import callback from "../../../controllers/connection/callback.js";
import connect from "../../../controllers/connection/connect.js";
import disconnect from "../../../controllers/connection/disconnect.js";
import status from "../../../controllers/connection/status.js";
import verify from "../../../controllers/connection/verify.js";

const connectionRoutes = new Hono<LucidHonoGeneric>()
	.post("/connect", ...connect)
	.get("/callback", ...callback)
	.get("/status", ...status)
	.post("/verify", ...verify)
	.delete("/", ...disconnect);

export default connectionRoutes;
