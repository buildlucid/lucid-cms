import { createHash } from "node:crypto";
import type { TaskMeta } from "vitest";
import loadContext from "../environment/load-context.ts";

/**
 * Attaches a digest of what a test saw to its result. The report then flags any setup whose
 * digest differs, so a database that behaves differently shows up even when the test passes.
 *
 * @example
 * ```ts
 * test("creates the same tables", async ({ task }) => {
 * 	recordDigest(task, tableNames);
 * });
 * ```
 */
const recordDigest = (task: { meta: TaskMeta }, value: unknown): void => {
	task.meta.harness = {
		//* digests are only compared between runs that share a seed
		seed: loadContext().seed,
		digest: createHash("sha256").update(JSON.stringify(value)).digest("hex"),
	};
};

export default recordDigest;
