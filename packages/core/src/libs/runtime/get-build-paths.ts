import { join, resolve } from "node:path";
import type { ResolvedLucidConfig } from "../../types/config.js";

/** Resolves generated public assets without importing build tooling. */
const getBuildPaths = (
	config: Pick<ResolvedLucidConfig, "build">,
	cwd = process.cwd(),
) => {
	const publicDist = resolve(cwd, config.build.outDir, "public");
	const spaOutput = join(publicDist, "lucid");

	return {
		publicDist,
		spaOutput,
		spaDistHtml: join(spaOutput, "index.html"),
	};
};

export default getBuildPaths;
