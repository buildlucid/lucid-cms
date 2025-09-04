import { Hono } from "hono";
import getSingle from "../../../controllers/media/get-single.js";
import getMultiple from "../../../controllers/media/get-multiple.js";
import createSingle from "../../../controllers/media/create-single.js";
import updateSingle from "../../../controllers/media/update-single.js";
import deleteSingle from "../../../controllers/media/delete-single.js";
import getPresignedUrl from "../../../controllers/media/get-presigned-url.js";
import clearSingleProcessed from "../../../controllers/media/clear-single-processed.js";
import clearAllProcessed from "../../../controllers/media/clear-all-processed.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

import createSingleFolder from "../../../controllers/media-folders/create-single.js";
import updateSingleFolder from "../../../controllers/media-folders/update-single.js";
import deleteSingleFolder from "../../../controllers/media-folders/delete-single.js";

const mediaRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/:id", ...getSingle)
	.post("/folders", ...createSingleFolder)
	.post("/presigned-url", ...getPresignedUrl)
	.post("/", ...createSingle)
	.patch("/folders/:id", ...updateSingleFolder)
	.patch("/:id", ...updateSingle)
	.delete("/folders/:id", ...deleteSingleFolder)
	.delete("/processed", ...clearAllProcessed)
	.delete("/:id/processed", ...clearSingleProcessed)
	.delete("/:id", ...deleteSingle);

export default mediaRoutes;
