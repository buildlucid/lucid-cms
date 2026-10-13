import z from "zod";
import { toolkitActorSchema } from "../../permission/toolkit-actor.js";

export const userReadSchema = z.strictObject({
	/** Returns what the actor could see in the admin, defaulting to a trusted system read. */
	actor: toolkitActorSchema.default({ type: "system" }),
});
