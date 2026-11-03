import z from "zod";
import { deployKeyInput, deploySchema } from "../schema.js";

export const inputSchema = z.object({
	key: deployKeyInput.optional().meta({
		description:
			"Leave out to list every deploy the person can view, with their last few runs. Pass a key for that deploy with its recent runs.",
	}),
});

export const outputSchema = z.object({
	data: z.array(deploySchema).meta({
		description:
			"Deploys with whether they're on, waiting changes, the queued and running runs, and recent finished runs, newest first.",
	}),
});
