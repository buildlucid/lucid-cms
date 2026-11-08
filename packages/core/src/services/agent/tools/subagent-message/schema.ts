import z from "zod";
import { subagentStartToolName } from "../subagent-start/constants.js";

export const inputSchema = z.object({
	subagentId: z.uuid().meta({
		description: `The sub-agent's ID from ${subagentStartToolName}.`,
	}),
	message: z
		.string()
		.trim()
		.min(1)
		.max(20_000)
		.meta({ description: "What to tell the sub-agent." }),
});

export const outputSchema = z.object({
	subagentId: z.uuid(),
	delivery: z.enum(["steer", "queued", "follow-up"]).meta({
		description:
			"steer: it takes the message before its next step. queued: it is working for someone else, so it gets the message once that ends. follow-up: it had finished, so the message started it again.",
	}),
});
