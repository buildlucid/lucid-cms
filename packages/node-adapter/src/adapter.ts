import { node as createNodeRuntime } from "./runtime.js";
import type { NodeAdapterOptionsValue, NodeRuntimeAdapter } from "./types.js";

const node = (options?: NodeAdapterOptionsValue): NodeRuntimeAdapter => {
	const runtime = createNodeRuntime(options);

	runtime.cli = {
		serve: async (serveProps) => {
			const { default: serveCommand } = await import("./cli/serve.js");
			return serveCommand(runtime.getOptions())(serveProps);
		},
		build: async (buildProps) => {
			const { default: buildCommand } = await import("./cli/build.js");
			return buildCommand(buildProps);
		},
	};

	return runtime;
};

export default node;
