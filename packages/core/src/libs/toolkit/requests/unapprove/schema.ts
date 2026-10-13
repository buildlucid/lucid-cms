import { toolkitUserActorSchema } from "../../../permission/toolkit-actor.js";
import { requestWriteSchema } from "../schema.js";

export const inputSchema = requestWriteSchema.extend({
	/** Approvals belong to people, so this is always a user actor. */
	actor: toolkitUserActorSchema,
});
