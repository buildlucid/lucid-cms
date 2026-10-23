import { LucidError } from "@lucidcms/core/runtime";
import type { RuntimeArtifactCustom } from "@lucidcms/core/types";
import constants from "../constants.js";
import type { CloudflareWorkerHandlerArtifact } from "../types.js";
import isRecord from "../utils/is-record.js";

const isWorkerHandlerArtifact = (
	artifact: RuntimeArtifactCustom,
): artifact is CloudflareWorkerHandlerArtifact =>
	artifact.type === constants.WORKER_HANDLER_ARTIFACT_TYPE &&
	isRecord(artifact.custom) &&
	typeof artifact.custom.event === "string" &&
	typeof artifact.custom.module === "string";

/** Renders plugin Worker handler imports and the object mapping each event to its handler, for generated Worker entries, with the handlers' module specifiers. */
const renderWorkerHandlers = (artifacts: RuntimeArtifactCustom[]) => {
	const handlers = artifacts
		.filter(isWorkerHandlerArtifact)
		.map((artifact) => artifact.custom);
	const events = new Set(["fetch", "scheduled"]);

	for (const handler of handlers) {
		if (events.has(handler.event)) {
			throw new LucidError({
				message: `The "${handler.event}" Worker event already has a handler.`,
			});
		}

		events.add(handler.event);
	}

	return {
		modules: handlers.map((handler) => handler.module),
		imports: handlers
			.map(
				(handler, index) =>
					`import handler${index} from ${JSON.stringify(handler.module)};`,
			)
			.join("\n"),
		handlers: `{ ${handlers
			.map(
				(handler, index) => `${JSON.stringify(handler.event)}: handler${index}`,
			)
			.join(", ")} }`,
	};
};

export default renderWorkerHandlers;
