import type z from "zod";
import type { LucidPluginTask } from "./types.js";

/**
 * Defines a plugin command's runtime task, validating JSON through `input` and returning `run` results as JSON with access to runtime bindings and services.
 *
 * @example
 * ```ts
 * const countTask = definePluginTask({
 *   input: z.object({ collectionKey: z.string() }),
 *   run: async ({ toolkit, input }) => {
 *     const result = await toolkit.documents.getMultiple({
 *       collectionKey: input.collectionKey,
 *       version: "latest",
 *     });
 *     return { total: result.data?.pagination.total ?? 0 };
 *   },
 * });
 *
 * // In the plugin's command
 * const { total } = await runTask<typeof countTask>("count", { collectionKey: "page" });
 * ```
 */
const definePluginTask = <Input extends z.ZodType, Result>(
	task: LucidPluginTask<Input, Result>,
) => task;

export default definePluginTask;
