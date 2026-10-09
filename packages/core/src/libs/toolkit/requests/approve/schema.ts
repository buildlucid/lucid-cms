import z from "zod";
import { toolkitUserActorSchema } from "../../schema.js";
import { requestBodySchema, requestWriteSchema } from "../schema.js";

export const inputSchema = requestWriteSchema.extend({
	/** Approvals belong to people, so this is always a user actor. */
	actor: toolkitUserActorSchema,
	/** The `reviewToken` from `getSingle`. Rejected once the revision, content or targets change. */
	ifUnchanged: z.string().min(1),
	/** A note for the people involved. */
	body: requestBodySchema.optional(),
});
