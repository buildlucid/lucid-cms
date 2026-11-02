import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getDiagnostics from "../../../controllers/diagnostics/get-diagnostics.js";
import runChecks from "../../../controllers/diagnostics/run-checks.js";

const diagnosticsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getDiagnostics)
	.post("/checks", ...runChecks);

export default diagnosticsRoutes;
