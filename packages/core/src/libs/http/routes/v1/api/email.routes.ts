import { Hono } from "hono";
import getSingle from "../../../controllers/email/get-single.js";
import getMultiple from "../../../controllers/email/get-multiple.js";
import deleteSingle from "../../../controllers/email/delete-single.js";
import resendSingle from "../../../controllers/email/resend-single.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const emailsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.post("/:id/resend", ...resendSingle);

export default emailsRoutes;
