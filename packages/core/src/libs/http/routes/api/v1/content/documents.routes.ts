import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../../types/hono.js";
import getMultiple from "../../../../controllers/documents/content/get-multiple.js";
import getSingle from "../../../../controllers/documents/content/get-single.js";

const contentDocumentsRoutes = new Hono<LucidHonoGeneric>()
	.get("/document/:collectionKey", ...getSingle)
	.get("/documents/:collectionKey", ...getMultiple);

export default contentDocumentsRoutes;
