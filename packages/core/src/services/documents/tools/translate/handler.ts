import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import checkNotHeld from "../../../document-editors/check-not-held.js";
import getRequestLink from "../../../requests/helpers/get-request-link.js";
import translateDocuments from "../../../translations/translate-documents.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getEditLink from "../../helpers/get-edit-link.js";
import linkReferences from "../helpers/link-references.js";
import type { DocumentWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/**
 * Translates documents into a request per locale, into an existing request's
 * proposals, or straight into latest when direct writes are enabled, and links
 * what changed to the chat.
 */
const translateDocumentsTool: ServiceFn<
	[{ input: z.output<typeof inputSchema> } & DocumentWriteToolProps],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const collection = context.config.collections.find(
		(candidate) =>
			candidate.key === input.collectionKey &&
			props.allowedCollectionKeys.includes(candidate.key),
	);
	if (!collection) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.collections.not.found.message"),
				status: 404,
			},
			data: undefined,
		};
	}

	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	//* translations land in latest or an existing proposal someone may have open, so their unsaved edits are protected: checked now so nothing is spent, and again when saving
	const direct = props.direct && input.requestId === undefined;
	const editorHolds = {
		userId: props.actor.type === "user" ? props.actor.userId : null,
	};
	if (direct || input.requestId !== undefined) {
		for (const documentId of input.documentIds) {
			const held = await checkNotHeld(context, {
				collectionKey: collection.key,
				documentId,
				requestId: direct ? null : input.requestId,
				userId: editorHolds.userId,
			});
			if (held.error) return held;
		}
	}

	const shared = {
		collectionKey: collection.key,
		documentIds: input.documentIds,
		targetLocales: input.locales,
		overwrite: input.overwrite,
		note: input.note,
		user: userRes.data,
		agentRunId: props.actor.agentRunId,
		editorHolds,
	};
	if (direct) {
		const translatedRes = await translateDocuments(context, {
			...shared,
			delivery: "latest",
		});
		if (translatedRes.error) return translatedRes;

		for (const documentId of translatedRes.data.documents) {
			const linked = await linkReferences(context, {
				conversationId: props.conversationId,
				toolName: props.toolName,
				reference: {
					type: "document",
					collectionKey: collection.key,
					documentId,
				},
			});
			if (linked.error) return linked;
		}

		return {
			error: undefined,
			data: {
				output: {
					outcome: "applied",
					requests: [],
					documents: translatedRes.data.documents.map((id) => ({
						id,
						link: getEditLink(context, collection.key, "latest", id),
					})),
					failures: translatedRes.data.failures,
				},
			},
		};
	}

	const translatedRes = await translateDocuments(context, {
		...shared,
		delivery: "request",
		requestId: input.requestId,
	});
	if (translatedRes.error) return translatedRes;

	for (const requestId of new Set(
		translatedRes.data.requests.map((request) => request.id),
	)) {
		const linked = await linkReferences(context, {
			conversationId: props.conversationId,
			toolName: props.toolName,
			reference: { type: "request", requestId },
		});
		if (linked.error) return linked;
	}

	return {
		error: undefined,
		data: {
			output: {
				outcome: "requested",
				requests: translatedRes.data.requests.map((request) => ({
					...request,
					link: getRequestLink(context, request.id),
				})),
				documents: [],
				failures: translatedRes.data.failures,
			},
		},
	};
};

export default translateDocumentsTool;
