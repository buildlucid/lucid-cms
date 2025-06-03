import { Hono } from "hono";
import createSingle from "../../../controllers/client-integrations/create-single.js";
import getAll from "../../../controllers/client-integrations/get-all.js";
import getSingle from "../../../controllers/client-integrations/get-single.js";
import deleteSingle from "../../../controllers/client-integrations/delete-single.js";
import updateSingle from "../../../controllers/client-integrations/update-single.js";
import regenerateKeys from "../../../controllers/client-integrations/regenerate-keys.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const clientIntegrationRoutes = new Hono<LucidHonoGeneric>()
	.post("/", ...createSingle)
	.get("/", ...getAll)
	.get("/:id", ...getSingle)
	.delete("/:id", ...deleteSingle)
	.patch("/:id", ...updateSingle)
	.post("/:id/regenerate-keys", ...regenerateKeys);

export default clientIntegrationRoutes;
