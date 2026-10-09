import { parseSourceHTML } from "@lucidcms/rich-text/server";
import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import addDocuments from "../../add-documents.js";
import close from "../../close.js";
import getRequestDocumentId from "../../helpers/get-request-document-id.js";
import getRequestLink from "../../helpers/get-request-link.js";
import removeDocument from "../../remove-document.js";
import reopen from "../../reopen.js";
import updateSingle from "../../update-single.js";
import updateTargets from "../../update-targets.js";
import checkCollections from "../helpers/check-collections.js";
import linkRequest from "../helpers/link-request.js";
import loadToolRequest from "../helpers/load-tool-request.js";
import type { RequestWriteToolProps } from "../types.js";
import type { changeSchema, inputSchema, outputSchema } from "./schema.js";

type Change = z.output<typeof changeSchema>;
type ChangeOf<Type extends Change["type"]> = Extract<Change, { type: Type }>;

/** Applies request changes with reopening first, document additions before removals, and closing last so the request keeps at least one document. */
const updateRequest: ServiceFn<
	[RequestWriteToolProps & z.output<typeof inputSchema>],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const requestRes = await loadToolRequest(context, {
		...props,
		id: props.requestId,
	});
	if (requestRes.error) return requestRes;

	const { user, request } = requestRes.data;
	const actor = { id: request.id, user, agentRunId: props.actor.agentRunId };
	const changesOf = <Type extends Change["type"]>(type: Type) =>
		props.changes.filter(
			(change): change is ChangeOf<Type> => change.type === type,
		);
	const status = changesOf("status").at(-1)?.status;
	if (status !== undefined && request.status === "completed") {
		return {
			error: {
				type: "basic",
				message: copy("server:core.tools.requests.status.completed", {
					data: { requestId: request.id },
				}),
				status: 409,
			},
			data: undefined,
		};
	}

	const collectionsRes = checkCollections({
		collectionKeys: props.changes.flatMap((change) =>
			"collectionKey" in change ? [change.collectionKey] : [],
		),
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (collectionsRes.error) return collectionsRes;

	if (status === "open" && request.status === "closed") {
		const reopenRes = await reopen(context, actor);
		if (reopenRes.error) return reopenRes;
	}

	const title = changesOf("title").at(-1)?.title;
	const description = changesOf("description").at(-1)?.description;
	const reviewerIds = changesOf("reviewers").at(-1)?.reviewerIds;
	if (
		title !== undefined ||
		description !== undefined ||
		reviewerIds !== undefined
	) {
		const updateRes = await updateSingle(context, {
			...actor,
			title,
			description:
				typeof description === "string"
					? parseSourceHTML(description)
					: description,
			reviewerIds,
		});
		if (updateRes.error) return updateRes;
	}

	const added = changesOf("addDocument");
	if (added.length > 0) {
		const addRes = await addDocuments(context, {
			...actor,
			documents: added.map((change) => ({
				collectionKey: change.collectionKey,
				documentId: change.documentId,
				source:
					request.type === "publish" ? (change.source ?? "latest") : undefined,
				targets: change.targets,
			})),
		});
		if (addRes.error) return addRes;
	}

	for (const change of [
		...changesOf("setTargets"),
		...changesOf("removeDocument"),
	]) {
		const documentRes = await getRequestDocumentId(context, {
			...change,
			id: request.id,
			user,
		});
		if (documentRes.error) return documentRes;

		const changeRes =
			change.type === "setTargets"
				? await updateTargets(context, {
						...actor,
						requestDocumentId: documentRes.data,
						targets: change.targets,
					})
				: await removeDocument(context, {
						...actor,
						requestDocumentId: documentRes.data,
					});
		if (changeRes.error) return changeRes;
	}

	if (status === "closed" && request.status === "open") {
		const closeRes = await close(context, actor);
		if (closeRes.error) return closeRes;
	}

	const linkRes = await linkRequest(context, props);
	if (linkRes.error) return linkRes;

	return {
		error: undefined,
		data: {
			output: {
				request: {
					id: request.id,
					type: request.type,
					status: status ?? request.status,
				},
				links: { request: getRequestLink(context, request.id) },
			},
		},
	};
};

export default updateRequest;
