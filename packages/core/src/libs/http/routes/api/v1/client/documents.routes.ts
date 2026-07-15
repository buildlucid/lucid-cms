import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import getMultiple from "../../../../controllers/documents/client/get-multiple.js";
import getSingle from "../../../../controllers/documents/client/get-single.js";

const clientDocumentsRoutes = new Hono<LucidHonoGeneric>()
	.get("/document/:collectionKey", ...getSingle)
	.get("/documents/:collectionKey", ...getMultiple);

export default clientDocumentsRoutes;
