import { afterEach, expect, test, vi } from "vitest";
import logger, {
	destroyLogger,
	initializeLogger,
	startLoggerBuffering,
	stopLoggerBuffering,
} from "./index.js";
import requestIdStorage from "./request-id-storage.js";
import type { LogEntry } from "./types.js";

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

test("entries logged while a request is handled carry its ID", async () => {
	const entries: LogEntry[] = [];
	await initializeLogger({
		level: "info",
		transport: { write: (entry) => void entries.push(entry) },
	});

	await requestIdStorage.run("request-1", async () => {
		await Promise.resolve();
		logger.info({ message: "During the request" });
	});
	logger.info({ message: "After the request" });
	await destroyLogger();

	expect(entries.map((entry) => entry.requestId)).toEqual([
		"request-1",
		undefined,
	]);
});
