import z from "zod";
import { subagentStartToolName } from "../subagent-start/constants.js";

export const inputSchema = z.object({
	subagentId: z.uuid().meta({
		description: `The sub-agent's ID from ${subagentStartToolName}.`,
	}),
});

export const outputSchema = z.object({
	subagentId: z.uuid(),
	stopped: z
		.boolean()
		.meta({ description: "False when it had already finished." }),
});
