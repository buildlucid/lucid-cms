import { LucidError } from "@lucidcms/core/runtime";
import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";
import constants from "../constants.js";
import type { CloudflareWorkerHandlerArtifact } from "../types.js";

/** Renders plugin Worker handler imports and the object mapping each event to its handler, for generated Worker entries. */
const renderWorkerHandlers = (artifacts: RuntimeBuildArtifactCustom[]) => {
	const handlers: CloudflareWorkerHandlerArtifact[] = artifacts
		.filter(
			(artifact) => artifact.type === constants.WORKER_HANDLER_ARTIFACT_TYPE,
		)
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
