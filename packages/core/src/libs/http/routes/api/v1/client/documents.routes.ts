import { Hono } from "hono";
import getSingle from "../../../../controllers/documents/client/get-single.js";
import getMultiple from "../../../../controllers/documents/client/get-multiple.js";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";

const clientDocumentsRoutes = new Hono<LucidHonoGeneric>()
	.get("/document/:collectionKey/:status", ...getSingle)
	.get("/documents/:collectionKey/:status", ...getMultiple);

export default clientDocumentsRoutes;
