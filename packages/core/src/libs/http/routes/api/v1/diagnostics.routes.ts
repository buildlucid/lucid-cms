import { Hono } from "hono";
import type { LucidHonoGeneric } from "../../../../../types/hono.js";
import getDiagnostics from "../../../controllers/diagnostics/get-diagnostics.js";
import getPackageUpdates from "../../../controllers/diagnostics/get-package-updates.js";
import runChecks from "../../../controllers/diagnostics/run-checks.js";
import submitBugReport from "../../../controllers/diagnostics/submit-bug-report.js";

const diagnosticsRoutes = new Hono<LucidHonoGeneric>()
	.get("/", ...getDiagnostics)
	.get("/updates", ...getPackageUpdates)
	.post("/checks", ...runChecks)
	.post("/bug-reports", ...submitBugReport);

export default diagnosticsRoutes;
