import type z from "zod";
import type { RuntimeTaskContext } from "./types.js";

/** Creates a runtime task whose `run` accepts parsed input and `execute` parses raw requests, leaving approval prompts and resubmission to commands. */
const defineRuntimeTask = <Input extends z.ZodType, Result>(task: {
	input: Input;
	run: (context: RuntimeTaskContext, input: z.output<Input>) => Promise<Result>;
}) => ({
	...task,
	execute: (context: RuntimeTaskContext, input: unknown) =>
		task.run(context, task.input.parse(input)),
});

export default defineRuntimeTask;
