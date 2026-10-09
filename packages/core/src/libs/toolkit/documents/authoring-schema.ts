import z from "zod";
import { toolkitActorSchema } from "../schema.js";
import { documentEditTokenSchema } from "./authoring-values-schema.js";

export const documentCollectionSchema = z.strictObject({
	/** Key of the registered collection. */
	collectionKey: z.string().min(1),
});

export const documentTargetSchema = documentCollectionSchema.extend({
	/** ID of the document in this collection. */
	id: z.number().int().positive(),
});

export const documentWriteSchema = documentCollectionSchema.extend({
	/** Use a system actor for scripts, or a user actor to check that user's current permissions. */
	actor: toolkitActorSchema,
});

export const documentUpdateSchema = documentWriteSchema.extend({
	id: documentTargetSchema.shape.id,
	/** Reject with a conflict if the document has changed since this edit token was returned. */
	ifUnchanged: documentEditTokenSchema.optional(),
});

/** An open request whose proposal of the document to use instead of latest, eg. a create request's new document. */
export const documentRequestIdSchema = z.number().int().positive().optional();
