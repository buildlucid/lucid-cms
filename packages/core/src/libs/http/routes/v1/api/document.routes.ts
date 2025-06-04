import { Hono } from "hono";
import createSingle from "../../../controllers/documents/create-single.js";
import updateSingle from "../../../controllers/documents/update-single.js";
import deleteMultiple from "../../../controllers/documents/delete-multiple.js";
import deleteSingle from "../../../controllers/documents/delete-single.js";
import getSingle from "../../../controllers/documents/get-single.js";
import getMultiple from "../../../controllers/documents/get-multiple.js";
import getMultipleRevisions from "../../../controllers/documents/get-multiple-revisions.js";
import restoreRevision from "../../../controllers/documents/restore-revision.js";
import promoteVersion from "../../../controllers/documents/promote-version.js";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";

const documentRoutes = new Hono<LucidHonoGeneric>()
	.post("/:collectionKey", ...createSingle)
	.patch("/:collectionKey/:id", ...updateSingle)
	.delete("/:collectionKey", ...deleteMultiple)
	.delete("/:collectionKey/:id", ...deleteSingle)
	.get("/:collectionKey/:id/:statusOrId", ...getSingle)
	.get("/:collectionKey/:status", ...getMultiple)
	.get("/:collectionKey/:id/revisions", ...getMultipleRevisions)
	.post("/:collectionKey/:id/:versionId/restore-revision", ...restoreRevision)
	.post("/:collectionKey/:id/:versionId/promote-version", ...promoteVersion);

export default documentRoutes;
