import z from "zod";
import { deployKeyInput } from "../schema.js";

export const inputSchema = z.object({ key: deployKeyInput });

export const outputSchema = z.object({
	runId: z.number(),
	queued: z.boolean().meta({
		description:
			"True when the run waits behind the deploy's run in progress, starting once it finishes.",
	}),
});
