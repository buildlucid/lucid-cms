import type { RuntimeBuildArtifactCustom } from "@lucidcms/core/types";
import renderWorkerHandlers from "./render-worker-handlers.js";

/** Creates the Worker entrypoint shared by Astro, Lucid and plugin handlers. */
export const createAstroWorkerSource = (props: {
	runtimeModulePath: string;
	artifacts: RuntimeBuildArtifactCustom[];
}) => {
	const workerHandlers = renderWorkerHandlers(props.artifacts);

	return `import { handle } from "@astrojs/cloudflare/handler";
import { createAstroWorker } from "@lucidcms/runtime-cloudflare/astro";
import { createLucidInvocation } from ${JSON.stringify(props.runtimeModulePath)};
${workerHandlers.imports}

export default createAstroWorker({ fetch: handle, createLucidInvocation }, ${workerHandlers.handlers});
`;
};
