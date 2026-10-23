import { afterEach, expect, test, vi } from "vitest";
import logger, {
	destroyLogger,
	initializeLogger,
	startLoggerBuffering,
	stopLoggerBuffering,
} from "./index.js";

afterEach(() => {
	vi.restoreAllMocks();
});

test("buffered entries keep the configured level after the transport is destroyed", async () => {
	await initializeLogger({ level: "error", transport: { write: () => {} } });
	startLoggerBuffering();
	logger.warn({ message: "Below the configured level" });
	logger.error({ message: "At the configured level" });
	await destroyLogger();

	const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
	const error = vi.spyOn(console, "error").mockImplementation(() => {});
	await stopLoggerBuffering();

	expect(warn).not.toHaveBeenCalled();
	expect(error).toHaveBeenCalledTimes(1);
});
