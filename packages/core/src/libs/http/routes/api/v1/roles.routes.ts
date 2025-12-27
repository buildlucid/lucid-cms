import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import createSingle from "../../../controllers/roles/create-single.js";
import deleteSingle from "../../../controllers/roles/delete-single.js";
import getMultiple from "../../../controllers/roles/get-multiple.js";
import getSingle from "../../../controllers/roles/get-single.js";
import updateSingle from "../../../controllers/roles/update-single.js";

const roleRoutes = new Hono<LucidHonoGeneric>()
	.post("/", ...createSingle)
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle);

export default roleRoutes;
