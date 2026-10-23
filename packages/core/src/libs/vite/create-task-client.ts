import z from "zod";
import constants from "../../constants/constants.js";
import { LucidError } from "../../utils/errors/index.js";
import type {
	RuntimeTaskInput,
	RuntimeTaskName,
	RuntimeTaskResult,
} from "../runtime/tasks/index.js";

/** Runs a runtime task in a Lucid dev server's runtime and returns its result. */
export type RuntimeTaskClient = <Name extends RuntimeTaskName>(
	name: Name,
	input: RuntimeTaskInput<Name>,
) => Promise<RuntimeTaskResult<Name>>;

const taskErrorSchema = z.object({
	message: z.string(),
	stack: z.string().optional(),
});

/** Creates a client for the runtime tasks of the Lucid dev server at `origin`, authenticated with its plugin's token. */
const createTaskClient =
	(props: { origin: string; token: string }): RuntimeTaskClient =>
	async <Name extends RuntimeTaskName>(
		name: Name,
		input: RuntimeTaskInput<Name>,
	) => {
		const response = await fetch(
			new URL(`${constants.dev.taskPath}${name}`, props.origin),
			{
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					[constants.dev.taskTokenHeader]: props.token,
				},
				body: JSON.stringify(input),
			},
		);
		if (!response.ok) {
			if (
				!response.headers.get("Content-Type")?.startsWith("application/json")
			) {
				throw new LucidError({ message: await response.text() });
			}

			const { message, stack } = taskErrorSchema.parse(await response.json());
			if (!stack) throw new LucidError({ message });

			// Unexpected errors keep the runtime's stack, so the CLI shows where they came from.
			const error = new Error(message);
			error.stack = stack;
			throw error;
		}

		// The server runs this version's tasks, so its JSON holds the task's result, which is absent for tasks returning nothing.
		const body: { result?: unknown } = await response.json();
		return body.result as RuntimeTaskResult<Name>;
	};

export default createTaskClient;
