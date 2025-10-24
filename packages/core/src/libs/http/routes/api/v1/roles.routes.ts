import { Hono } from "hono";
import createSingle from "../../../controllers/roles/create-single.js";
import getSingle from "../../../controllers/roles/get-single.js";
import getMultiple from "../../../controllers/roles/get-multiple.js";
import deleteSingle from "../../../controllers/roles/delete-single.js";
import updateSingle from "../../../controllers/roles/update-single.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const roleRoutes = new Hono<LucidHonoGeneric>()
	.post("/", ...createSingle)
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle);

export default roleRoutes;
