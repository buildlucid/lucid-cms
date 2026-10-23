import { realpathSync } from "node:fs";
import path from "node:path";

/** Resolves symlinks in a path, through its nearest existing parent when it doesn't exist yet. */
const resolveRealPath = (target: string): string => {
	try {
		return realpathSync(target);
	} catch {
		const parent = path.dirname(target);
		return parent === target
			? target
			: path.join(resolveRealPath(parent), path.basename(target));
	}
};

/** Lists original and resolved file or folder paths for `server.fs.deny` because Vite resolves only a symlinked root in request paths. */
const listResolvedPaths = (target: string) => {
	const paths = new Set([target]);
	for (let folder = target; ; folder = path.dirname(folder)) {
		paths.add(
			path.join(resolveRealPath(folder), path.relative(folder, target)),
		);
		if (path.dirname(folder) === folder) break;
	}
	return [...paths];
};

export default listResolvedPaths;
