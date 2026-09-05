import { EventEmitter } from "node:events";
import { expect, test, vi } from "vitest";
import { createResourceWatchPlugin } from "./watch.js";

test("asks Astro to reload when a new resource is added and removes its listener on restart", () => {
	const watcher = Object.assign(new EventEmitter(), { add: vi.fn() });
	const changes = vi.fn();
	watcher.on("change", changes);
	const plugin = createResourceWatchPlugin(
		"/project/lucid.config.ts",
		new Set([
			"/project/src/lucid/routes",
			"/project/src/lucid/routes/known.ts",
		]),
	);
	if (
		typeof plugin.configureServer !== "function" ||
		typeof plugin.closeBundle !== "function"
	)
		throw new Error("Missing watcher lifecycle hooks");
	plugin.configureServer.call({} as never, { watcher } as never);
	watcher.emit("add", "/project/src/lucid/routes/nested/new.ts");
	expect(changes).toHaveBeenCalledWith("/project/lucid.config.ts");
	changes.mockClear();
	watcher.emit("add", "/project/src/lucid/routes/known.ts");
	watcher.emit("add", "/project/src/lucid/routes-other/unrelated.ts");
	expect(changes).not.toHaveBeenCalled();
	plugin.closeBundle.call({} as never);
	watcher.emit("add", "/project/src/lucid/routes/another.ts");
	expect(changes).not.toHaveBeenCalled();
});
