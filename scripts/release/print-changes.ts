import pc from "picocolors";
import type { VersionChange } from "./types.ts";

/** Prints changes grouped by file, with each value's old and new version. */
const printChanges = (changes: VersionChange[]) => {
	for (const [file, fileChanges] of Map.groupBy(
		changes,
		(change) => change.path,
	)) {
		console.log(`  ${pc.bold(file)}`);
		for (const change of fileChanges) {
			console.log(
				`    ${change.field}: ${pc.dim(change.from ?? "none")} → ${pc.green(change.to)}`,
			);
		}
	}
};

export default printChanges;
