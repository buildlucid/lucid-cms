import { createLogger, type ResolvedConfig } from "vite";
import { expect, test, vi } from "vitest";
import inspectorPortLogsPlugin from "./inspector-port-logs-plugin.js";

test("leaves out the debugger port warning but keeps other warnings", () => {
	const logger = createLogger();
	const warn = vi.spyOn(logger, "warn").mockImplementation(() => {});
	const { configResolved } = inspectorPortLogsPlugin();
	if (typeof configResolved !== "function") throw new Error("Expected a hook");
	configResolved.call(undefined as never, { logger } as ResolvedConfig);
	// Dev restarts resolve the config again with the same logger.
	const filtered = logger.warn;
	configResolved.call(undefined as never, { logger } as ResolvedConfig);
	expect(logger.warn).toBe(filtered);

	logger.warn(
		"\u001b[2mDefault inspector port 9229 not available, using 9230 instead\n\u001b[22m",
	);
	logger.warn("Sourcemap is likely to be incorrect");

	expect(warn.mock.calls).toEqual([
		["Sourcemap is likely to be incorrect", undefined],
	]);
});
