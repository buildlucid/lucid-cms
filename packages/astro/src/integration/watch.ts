import fs from "node:fs/promises";
import path from "node:path";
import { collectFiles } from "./filesystem.js";
import type { ResolvedLucidProject } from "./project.js";

/** Collects config and asset inputs that should restart Astro development. */
const collectWatchFiles = async (project: ResolvedLucidProject) => {
	const files = new Set([
		project.configPath,
		...project.loaded.configDependencies,
	]);
	const paths = [
		path.resolve(
			project.loaded.projectRoot,
			project.loaded.config.email.templates.directory,
		),
		...project.loaded.config.build.paths.copyPublic.map((entry) =>
			path.resolve(
				project.loaded.projectRoot,
				typeof entry === "string" ? entry : entry.input,
			),
		),
	];

	for (const targetPath of paths) {
		files.add(targetPath);
		try {
			const stats = await fs.stat(targetPath);
			if (!stats.isDirectory()) continue;
			for (const filePath of await collectFiles(targetPath)) {
				files.add(filePath);
			}
		} catch {}
	}

	return files;
};

export default collectWatchFiles;
