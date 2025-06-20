import { Hono } from "hono";
import inviteSingle from "../../../controllers/users/invite-single.js";
import getSingle from "../../../controllers/users/get-single.js";
import getMultiple from "../../../controllers/users/get-multiple.js";
import deleteSingle from "../../../controllers/users/delete-single.js";
import updateSingle from "../../../controllers/users/update-single.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const usersRoutes = new Hono<LucidHonoGeneric>()
	.post("/", ...inviteSingle)
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle);

export default usersRoutes;
