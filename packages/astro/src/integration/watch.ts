import path from "node:path";
import type { Plugin } from "vite";
import type { ResolvedLucidProject } from "./project.js";

/** Collects the resource files and directories known when Astro loads its config. */
const collectWatchFiles = (project: ResolvedLucidProject) =>
	new Set([
		project.configPath,
		...project.loaded.configDependencies,
		...project.loaded.resources.watch,
	]);

/** Routes new resource files through Astro's config restart lifecycle. */
export const createResourceWatchPlugin = (
	configPath: string,
	watched: Set<string>,
): Plugin => {
	let detach = () => {};
	return {
		name: "lucid:resource-watch",
		apply: "serve",
		configureServer(server) {
			server.watcher.add([...watched]);
			const onAdd = (file: string) => {
				if (watched.has(file)) return;
				const inResourceDirectory = [...watched].some((directory) => {
					const relative = path.relative(directory, file);
					return (
						relative !== "" &&
						relative !== ".." &&
						!relative.startsWith(`..${path.sep}`) &&
						!path.isAbsolute(relative)
					);
				});
				// Astro watches exact filenames, so a previously unknown file needs a config change event.
				if (inResourceDirectory) server.watcher.emit("change", configPath);
			};
			server.watcher.on("add", onAdd);
			detach = () => {
				server.watcher.off("add", onAdd);
			};
		},
		closeBundle() {
			detach();
		},
	};
};

export default collectWatchFiles;
