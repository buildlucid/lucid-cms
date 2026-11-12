import path from "node:path";

const root = path.resolve(import.meta.dirname, "../../..");

/** Where the harness finds its inputs and writes its output. */
export const paths = {
	/** The `tests` workspace. */
	root,
	/** The repository the workspace sits in. */
	repository: path.resolve(root, ".."),
	setups: path.join(root, "setups"),
	suites: path.join(root, "suites"),
	/** Reports, logs and databases from runs. Ignored by git. */
	output: path.join(root, ".harness"),
	/** What later runs need from earlier ones. See `updateHistory`. */
	history: path.join(root, ".harness", "history.json"),
	harness: path.join(root, "harness/src"),
	bin: path.resolve(root, "../node_modules/.bin"),
} as const;
