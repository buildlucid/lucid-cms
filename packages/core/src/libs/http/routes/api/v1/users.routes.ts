import { Hono } from "hono";
import inviteSingle from "../../../controllers/users/invite-single.js";
import getSingle from "../../../controllers/users/get-single.js";
import getMultiple from "../../../controllers/users/get-multiple.js";
import deleteSingle from "../../../controllers/users/delete-single.js";
import deleteSinglePermanently from "../../../controllers/users/delete-single-permanently.js";
import restoreMultiple from "../../../controllers/users/restore-multiple.js";
import updateSingle from "../../../controllers/users/update-single.js";
import getMultipleLogins from "../../../controllers/user-logins/get-multiple.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const usersRoutes = new Hono<LucidHonoGeneric>()
	.post("/", ...inviteSingle)
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.get("/logins/:id", ...getMultipleLogins)
	.delete("/:id/permanent", ...deleteSinglePermanently)
	.delete("/:id", ...deleteSingle)
	.post("/restore", ...restoreMultiple)
	.patch("/:id", ...updateSingle);

export default usersRoutes;
