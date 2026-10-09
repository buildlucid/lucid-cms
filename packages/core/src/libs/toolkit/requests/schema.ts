import { parseSourceHTML } from "@lucidcms/rich-text/server";
import z from "zod";
import { requestDocumentInputSchema } from "../../../schemas/requests.js";
import { richTextJSONSchema } from "../../../schemas/shared/rich-text.js";
import { toolkitActorSchema } from "../schema.js";

export const requestReadSchema = z.strictObject({
	/** Reads as this user, with their live permissions. Defaults to a trusted system read. */
	actor: toolkitActorSchema.default({ kind: "system" }),
});

export const requestWriteSchema = z.strictObject({
	id: z.number().int().positive(),
	/** Use a system actor for scripts, or a user actor to check that user's current permissions. */
	actor: toolkitActorSchema,
});

export const requestDocumentSchema = requestWriteSchema.extend({
	collectionKey: requestDocumentInputSchema.shape.collectionKey,
	documentId: requestDocumentInputSchema.shape.documentId,
});

export const requestCommentSchema = requestWriteSchema.extend({
	/** ID of the comment, as returned by `comments.create` or listed in `getSingle` events. */
	commentId: z.number().int().positive(),
});

/** HTML, eg. `<p>Looks good</p>`, or rich text JSON. Mention someone with `<span data-lucid-mention data-lucid-user-id="1"></span>`. */
export const requestBodySchema = z.union([
	z
		.string()
		.trim()
		.min(1)
		.transform((html) => parseSourceHTML(html)),
	richTextJSONSchema,
]);
