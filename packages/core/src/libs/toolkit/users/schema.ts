import z from "zod";
import { toolkitActorSchema } from "../schema.js";

export const userReadSchema = z.strictObject({
	/** Returns what the actor could see in the admin, defaulting to a trusted system read. */
	actor: toolkitActorSchema.default({ kind: "system" }),
});
