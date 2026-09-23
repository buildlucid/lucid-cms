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
			"/project/lucid/templates",
			"/project/lucid/templates/known.mustache",
		]),
	);
	if (
		typeof plugin.configureServer !== "function" ||
		typeof plugin.closeBundle !== "function"
	)
		throw new Error("Missing watcher lifecycle hooks");
	plugin.configureServer.call({} as never, { watcher } as never);
	watcher.emit("add", "/project/lucid/templates/nested/new.mustache");
	expect(changes).toHaveBeenCalledWith("/project/lucid.config.ts");
	changes.mockClear();
	watcher.emit("add", "/project/lucid/templates/known.mustache");
	watcher.emit("add", "/project/lucid/templates-other/unrelated.mustache");
	expect(changes).not.toHaveBeenCalled();
	plugin.closeBundle.call({} as never);
	watcher.emit("add", "/project/lucid/templates/another.mustache");
	expect(changes).not.toHaveBeenCalled();
});
