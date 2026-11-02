import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import checkImport from "../../../controllers/transfer/check-import.js";
import exportFile from "../../../controllers/transfer/export-file.js";
import importEntry from "../../../controllers/transfer/import-entry.js";

const transferRoutes = new Hono<LucidHonoGeneric>()
	.post("/export", ...exportFile)
	.post("/import/check", ...checkImport)
	.post("/import", ...importEntry);

export default transferRoutes;
