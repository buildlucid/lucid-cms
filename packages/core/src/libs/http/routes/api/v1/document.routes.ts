import { Hono } from "hono";
import createSingle from "../../../controllers/documents/create-single.js";
import createVersion from "../../../controllers/documents/create-version.js";
import deleteMultiple from "../../../controllers/documents/delete-multiple.js";
import deleteSingle from "../../../controllers/documents/delete-single.js";
import deleteSinglePermanently from "../../../controllers/documents/delete-single-permanently.js";
import getSingle from "../../../controllers/documents/get-single.js";
import getMultiple from "../../../controllers/documents/get-multiple.js";
import getMultipleRevisions from "../../../controllers/documents/get-multiple-revisions.js";
import restoreMultiple from "../../../controllers/documents/restore-multiple.js";
import restoreRevision from "../../../controllers/documents/restore-revision.js";
import promoteVersion from "../../../controllers/documents/promote-version.js";
import updateVersion from "../../../controllers/documents/update-version.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const documentRoutes = new Hono<LucidHonoGeneric>()
	.post("/:collectionKey", ...createSingle)
	.post("/:collectionKey/restore", ...restoreMultiple)
	.post("/:collectionKey/:id", ...createVersion)
	.delete("/:collectionKey", ...deleteMultiple)
	.delete("/:collectionKey/:id/permanent", ...deleteSinglePermanently)
	.delete("/:collectionKey/:id", ...deleteSingle)
	.get("/:collectionKey/:status", ...getMultiple)
	.get("/:collectionKey/:id/revisions", ...getMultipleRevisions)
	.get("/:collectionKey/:id/:statusOrId", ...getSingle)
	.post("/:collectionKey/:id/:versionId/restore-revision", ...restoreRevision)
	.post("/:collectionKey/:id/:versionId/promote-version", ...promoteVersion)
	.patch("/:collectionKey/:id/:versionId", ...updateVersion);

export default documentRoutes;
