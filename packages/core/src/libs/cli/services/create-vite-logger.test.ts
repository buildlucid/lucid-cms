import { stripVTControlCharacters } from "node:util";
import { afterEach, expect, test, vi } from "vitest";
import createViteLogger from "./create-vite-logger.js";

afterEach(() => {
	vi.restoreAllMocks();
});

test("leaves out routine server and restart messages but keeps the client's and warnings", () => {
	const log = vi.spyOn(console, "log").mockImplementation(() => {});
	const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	const logger = createViteLogger();

	logger.info("page reload src/collections/pages.ts", {
		timestamp: true,
		environment: "\u001b[2m(ssr)\u001b[22m",
	});
	logger.info("server restarted.", { timestamp: true });
	logger.info("Forced re-optimization of dependencies", {
		environment: "(client)",
	});
	logger.info("hmr update /src/admin/startup.ts", {
		timestamp: true,
		environment: "(client)",
	});
	logger.warn("Sourcemap is likely to be incorrect", {
		environment: "(ssr)",
	});

	expect(
		log.mock.calls.map(([line]) => stripVTControlCharacters(String(line))),
	).toEqual([
		expect.stringContaining("(client) hmr update /src/admin/startup.ts"),
	]);
	expect(warn).toHaveBeenCalledTimes(1);
});
