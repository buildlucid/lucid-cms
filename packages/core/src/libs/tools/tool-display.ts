import type { z } from "zod";
import type { AgentToolDisplay } from "../../types/response.js";

/** Describes a call in the chat from its input. Invalid input leaves the call described by its title. */
export const toolDisplay =
	<Input extends z.ZodObject>(
		schema: Input,
		display: (input: z.output<Input>) => AgentToolDisplay | undefined,
	) =>
	(input: Record<string, unknown>) => {
		const parsed = schema.safeParse(input);
		return parsed.success ? display(parsed.data) : undefined;
	};
