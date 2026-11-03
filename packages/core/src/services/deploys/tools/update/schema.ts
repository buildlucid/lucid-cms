import z from "zod";
import { deployKeyInput } from "../schema.js";

export const inputSchema = z.object({
	key: deployKeyInput,
	action: z.enum(["cancel-run", "cancel-queued"]).meta({
		description:
			"cancel-run cancels the run in progress, stopping it on the host when the host allows it. cancel-queued drops the run waiting behind it.",
	}),
});

export const outputSchema = z.object({
	runId: z.number(),
	result: z.enum(["dropped", "stopped", "stopped-waiting"]).meta({
		description:
			"dropped: the queued run won't start. stopped: the host is stopping the build. stopped-waiting: the host can't be stopped from Lucid, so the build may still finish, but Lucid no longer waits for it.",
	}),
});
