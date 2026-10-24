import { EventEmitter } from "node:events";
import { expect, test, vi } from "vitest";
import { createResourceWatchPlugin } from "./watch.js";

test("asks Astro to reload when a new resource is added and removes its listener on restart", () => {
	const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });
	const changes = vi.fn();
	watcher.on("change", changes);
	const plugin = createResourceWatchPlugin(
		"/project/lucid.config.ts",
		new Set(["/project/emails", "/project/emails/known.kiln"]),
	);
	if (
		typeof plugin.configureServer !== "function" ||
		typeof plugin.closeServer !== "function"
	)
		throw new Error("Missing watcher lifecycle hooks");
	plugin.configureServer.call({} as never, { watcher } as never);
	watcher.emit("add", "/project/emails/nested/new.kiln");
	expect(changes).toHaveBeenCalledWith("/project/lucid.config.ts");
	changes.mockClear();
	watcher.emit("add", "/project/emails/known.kiln");
	watcher.emit("add", "/project/emails-other/unrelated.kiln");
	expect(changes).not.toHaveBeenCalled();
	plugin.closeServer.call({} as never, { reason: "restart" });
	watcher.emit("add", "/project/emails/another.kiln");
	expect(changes).not.toHaveBeenCalled();
});
