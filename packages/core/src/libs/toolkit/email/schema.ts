import z from "zod";
import { toolkitActorSchema } from "../../permission/toolkit-actor.js";

export const emailReadSchema = z.strictObject({
	/** Reads as this user, who needs `email:read`. Defaults to a trusted system read. */
	actor: toolkitActorSchema.default({ type: "system" }),
});
