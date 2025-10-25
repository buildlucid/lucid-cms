import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import clearAllProcessed from "../../../controllers/media/clear-all-processed.js";
import clearSingleProcessed from "../../../controllers/media/clear-single-processed.js";
import createSingle from "../../../controllers/media/create-single.js";
import deleteBatch from "../../../controllers/media/delete-batch.js";
import deleteSingle from "../../../controllers/media/delete-single.js";
import deleteSinglePermanently from "../../../controllers/media/delete-single-permanently.js";
import getMultiple from "../../../controllers/media/get-multiple.js";
import getPresignedUrl from "../../../controllers/media/get-presigned-url.js";
import getSingle from "../../../controllers/media/get-single.js";
import moveFolder from "../../../controllers/media/move-folder.js";
import restoreMultiple from "../../../controllers/media/restore-multiple.js";
import updateSingle from "../../../controllers/media/update-single.js";

import createSingleFolder from "../../../controllers/media-folders/create-single.js";
import deleteSingleFolder from "../../../controllers/media-folders/delete-single.js";
import getAllFoldersHierarchy from "../../../controllers/media-folders/get-hierarchy.js";
import getMultipleFolders from "../../../controllers/media-folders/get-multiple.js";
import updateSingleFolder from "../../../controllers/media-folders/update-single.js";

import getMediaShareLinks from "../../../controllers/media-share-links/get-multiple.js";
import createMediaShareLink from "../../../controllers/media-share-links/create-single.js";
import updateMediaShareLink from "../../../controllers/media-share-links/update-single.js";
import deleteMediaShareLink from "../../../controllers/media-share-links/delete-single.js";
import deleteAllMediaShareLinks from "../../../controllers/media-share-links/delete-multiple.js";
import deleteAllMediaShareLinksSystem from "../../../controllers/media-share-links/delete-all.js";
import getSingleMediaShareLink from "../../../controllers/media-share-links/get-single.js";

const mediaRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getMultiple)
	.get("/folders", ...getMultipleFolders)
	.get("/folders/hierarchy", ...getAllFoldersHierarchy)
	.get("/:id/share-links", ...getMediaShareLinks)
	.get("/:id/share-links/:linkId", ...getSingleMediaShareLink)
	.get("/:id", ...getSingle)
	.post("/folders", ...createSingleFolder)
	.post("/presigned-url", ...getPresignedUrl)
	.post("/", ...createSingle)
	.post("/restore", ...restoreMultiple)
	.post("/:id/share-links", ...createMediaShareLink)
	.patch("/folders/:id", ...updateSingleFolder)
	.patch("/:id/move", ...moveFolder)
	.patch("/:id/share-links/:linkId", ...updateMediaShareLink)
	.patch("/:id", ...updateSingle)
	.delete("/folders/:id", ...deleteSingleFolder)
	.delete("/processed", ...clearAllProcessed)
	.delete("/share-links", ...deleteAllMediaShareLinksSystem)
	.delete("/batch", ...deleteBatch)
	.delete("/:id/processed", ...clearSingleProcessed)
	.delete("/:id/permanent", ...deleteSinglePermanently)
	.delete("/:id/share-links/:linkId", ...deleteMediaShareLink)
	.delete("/:id/share-links", ...deleteAllMediaShareLinks)
	.delete("/:id", ...deleteSingle);

export default mediaRoutes;
