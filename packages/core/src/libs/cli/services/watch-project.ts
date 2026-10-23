import path from "node:path";
import type { ViteDevServer } from "vite";

/** Calls `onChange` for files under `inputs` so config, resources and extra watched paths loaded in Node trigger a fresh dev server instead of hot updates. */
const watchProject = (
	server: ViteDevServer,
	props: { inputs: string[]; onChange: (file: string) => void },
) => {
	server.watcher.add(props.inputs);
	server.watcher.on("all", (event, file) => {
		if (event !== "add" && event !== "change" && event !== "unlink") return;

		const absolute = path.resolve(file);
		const changed = props.inputs.some(
			(input) =>
				absolute === input || absolute.startsWith(`${input}${path.sep}`),
		);
		if (changed) props.onChange(absolute);
	});
};

export default watchProject;
