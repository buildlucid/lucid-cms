import { Hono } from "hono";
import getSingle from "../../../controllers/media/get-single.js";
import getMultiple from "../../../controllers/media/get-multiple.js";
import createSingle from "../../../controllers/media/create-single.js";
import updateSingle from "../../../controllers/media/update-single.js";
import deleteSingle from "../../../controllers/media/delete-single.js";
import getPresignedUrl from "../../../controllers/media/get-presigned-url.js";
import clearSingleProcessed from "../../../controllers/media/clear-single-processed.js";
import deleteSinglePermanently from "../../../controllers/media/delete-single-permanently.js";
import clearAllProcessed from "../../../controllers/media/clear-all-processed.js";
import moveFolder from "../../../controllers/media/move-folder.js";
import deleteBatch from "../../../controllers/media/delete-batch.js";
import restoreMultiple from "../../../controllers/media/restore-multiple.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

import createSingleFolder from "../../../controllers/media-folders/create-single.js";
import getMultipleFolders from "../../../controllers/media-folders/get-multiple.js";
import updateSingleFolder from "../../../controllers/media-folders/update-single.js";
import deleteSingleFolder from "../../../controllers/media-folders/delete-single.js";
import getAllFoldersHierarchy from "../../../controllers/media-folders/get-hierarchy.js";

const mediaRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/folders", ...getMultipleFolders)
	.get("/folders/hierarchy", ...getAllFoldersHierarchy)
	.get("/:id", ...getSingle)
	.post("/folders", ...createSingleFolder)
	.post("/presigned-url", ...getPresignedUrl)
	.post("/", ...createSingle)
	.post("/restore", ...restoreMultiple)
	.patch("/folders/:id", ...updateSingleFolder)
	.patch("/:id", ...updateSingle)
	.patch("/:id/move", ...moveFolder)
	.delete("/folders/:id", ...deleteSingleFolder)
	.delete("/processed", ...clearAllProcessed)
	.delete("batch", ...deleteBatch)
	.delete("/:id/processed", ...clearSingleProcessed)
	.delete("/:id/permanent", ...deleteSinglePermanently)
	.delete("/:id", ...deleteSingle);

export default mediaRoutes;
