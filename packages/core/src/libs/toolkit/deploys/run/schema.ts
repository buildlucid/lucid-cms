import z from "zod";
import { toolkitActorSchema } from "../../../permission/toolkit-actor.js";

export const inputSchema = z.object({
	key: z.string().trim().min(1),
	/** Who the run is for. User actors need the deploy's `run` permission. Defaults to the system. */
	actor: toolkitActorSchema.default({ type: "system" }),
});
