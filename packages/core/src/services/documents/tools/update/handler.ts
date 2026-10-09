import type z from "zod";
import { getDocumentShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasAccess from "../../../../libs/permission/has-access.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getRequestLink from "../../../requests/helpers/get-request-link.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getEditLink from "../../helpers/get-edit-link.js";
import readDocumentContent from "../../helpers/read-document-content.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import writeSingle from "../../write-single.js";
import linkReferences from "../helpers/link-references.js";
import requestDetails from "../helpers/request-details.js";
import resolveRequest from "../helpers/resolve-request.js";
import type { DocumentWriteToolProps } from "../types.js";
import buildOperations from "./build-operations.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Edits a request proposal, or saves latest when direct writes are enabled and no request is supplied. */
const updateDocument: ServiceFn<
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

	const localeRes = resolveContentLocale(
		context,
		collection,
		input.contentLocale,
	);
	if (localeRes.error) return localeRes;

	const userRes = await resolveActorUser(context, { actor: props.actor });
	if (userRes.error) return userRes;

	const user = userRes.data;
	const requested = !props.direct || input.requestId !== undefined;
	if (
		!hasAccess({
			user,
			requiredPermissions: [
				requested
					? Permissions.RequestsRead
					: getCollectionPermission(collection.key, "update"),
			],
		})
	) {
		return {
			error: {
				type: "basic",
				message: copy(
					"server:core.documents.authoring.actor.permission.denied",
				),
				status: 403,
			},
			data: undefined,
		};
	}

	const collectionLabel =
		context.translate(collection.getData.details.labels.singular) ??
		collection.key;
	const requestRes = requested
		? await resolveRequest(context, {
				type: "publish",
				document: {
					collectionKey: collection.key,
					documentId: input.id,
					source: "latest",
					targets: ["latest"],
				},
				requestId: input.requestId,
				conversationId: props.conversationId,
				user,
				agentRunId: props.actor.agentRunId,
				details: requestDetails(
					input.request,
					context.translate("server:core.tools.documents.request.update", {
						data: { collection: collectionLabel, id: input.id },
					}),
				),
			})
		: undefined;
	if (requestRes?.error) return requestRes;

	const request = requestRes?.data.request;
	const versionId = requestRes?.data.document.source_version_id ?? undefined;
	const currentRes = await readDocumentContent(context, {
		collectionKey: collection.key,
		id: input.id,
		versionId,
	});
	if (currentRes.error) return currentRes;

	const operationsRes = buildOperations({
		shape: getDocumentShape({
			collection,
			localization: context.config.localization,
		}),
		current: currentRes.data.data,
		fields: input.fields,
		bricks: input.bricks,
		locale: localeRes.data,
	});
	if (operationsRes.error) return operationsRes;

	const written = await writeSingle(context, {
		kind: "patch",
		collectionKey: collection.key,
		id: input.id,
		versionId,
		ifUnchanged: currentRes.data.editToken,
		operations: operationsRes.data,
		userId: user.id,
		authUser: user,
		agentRunId: props.actor.agentRunId,
	});
	if (written.error) return written;

	const linked = await linkReferences(context, {
		conversationId: props.conversationId,
		toolName: props.toolName,
		reference: request
			? { type: "request", requestId: request.id }
			: {
					type: "document",
					collectionKey: collection.key,
					documentId: input.id,
				},
	});
	if (linked.error) return linked;

	return {
		error: undefined,
		data: {
			output: {
				outcome: request ? "requested" : "applied",
				document: { collectionKey: collection.key, id: input.id },
				request: request ?? null,
				links: request
					? { request: getRequestLink(context, request.id) }
					: {
							edit: getEditLink(context, collection.key, "latest", input.id),
						},
			},
		},
	};
};

export default updateDocument;
