import z from "zod";
import { toolkitActorSchema } from "../../../permission/toolkit-actor.js";

export const inputSchema = z.strictObject({
	/** Use a system actor for scripts, or a user actor to export only what that user can read. */
	actor: toolkitActorSchema,
	/** What to export by resource. Each resource checks its own selection. */
	select: z.record(z.string(), z.unknown()),
	/** Also export documents the selected records link to, one level deep. Defaults to false. */
	linked: z.boolean().optional(),
});
