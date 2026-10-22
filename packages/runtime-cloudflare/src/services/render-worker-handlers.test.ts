import { expect, test } from "vitest";
import constants from "../constants.js";
import renderWorkerHandlers from "./render-worker-handlers.js";

const handlerArtifact = (event: string, module: string) => ({
	type: constants.WORKER_HANDLER_ARTIFACT_TYPE,
	custom: { event, module },
});

test("maps each plugin event to its handler module", () => {
	const rendered = renderWorkerHandlers([
		handlerArtifact("queue", "@example/plugin/worker"),
		{ type: "other", custom: {} },
	]);

	expect(rendered.imports).toBe(
		'import handler0 from "@example/plugin/worker";',
	);
	expect(rendered.handlers).toBe('{ "queue": handler0 }');
});

test("rejects events that already have a handler", () => {
	expect(() =>
		renderWorkerHandlers([handlerArtifact("fetch", "@example/plugin/worker")]),
	).toThrow('The "fetch" Worker event already has a handler.');
	expect(() =>
		renderWorkerHandlers([
			handlerArtifact("queue", "@example/a/worker"),
			handlerArtifact("queue", "@example/b/worker"),
		]),
	).toThrow('The "queue" Worker event already has a handler.');
});
