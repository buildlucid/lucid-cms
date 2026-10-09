import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasAccess from "../../../../libs/permission/has-access.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getRequestLink from "../../../requests/helpers/get-request-link.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getEditLink from "../../helpers/get-edit-link.js";
import unpublish from "../../unpublish.js";
import linkReferences from "../helpers/link-references.js";
import requestDetails from "../helpers/request-details.js";
import resolveRequest from "../helpers/resolve-request.js";
import type { DocumentWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Unpublishes through a request, or directly when enabled, no request is supplied and review is optional. */
const unpublishDocument: ServiceFn<
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

	const user = userRes.data;
	const requested =
		!props.direct ||
		input.requestId !== undefined ||
		collection.getData.publishing.review?.unpublish.includes(input.target) ===
			true;
	if (
		!hasAccess({
			user,
			requiredPermissions: [
				requested
					? Permissions.RequestsRead
					: getCollectionPermission(collection.key, "publish"),
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

	const document = { collectionKey: collection.key, id: input.documentId };
	if (!requested) {
		const unpublished = await unpublish(context, {
			collectionKey: collection.key,
			documentId: input.documentId,
			target: input.target,
			user,
			agentRunId: props.actor.agentRunId,
		});
		if (unpublished.error) return unpublished;

		const linked = await linkReferences(context, {
			conversationId: props.conversationId,
			toolName: props.toolName,
			reference: {
				type: "document",
				collectionKey: collection.key,
				documentId: input.documentId,
			},
		});
		if (linked.error) return linked;

		return {
			error: undefined,
			data: {
				output: {
					outcome: "applied",
					document,
					request: null,
					links: {
						edit: getEditLink(
							context,
							collection.key,
							"latest",
							input.documentId,
						),
					},
				},
			},
		};
	}

	const requestRes = await resolveRequest(context, {
		type: "unpublish",
		document: {
			collectionKey: collection.key,
			documentId: input.documentId,
			targets: [input.target],
		},
		requestId: input.requestId,
		conversationId: props.conversationId,
		user,
		agentRunId: props.actor.agentRunId,
		details: requestDetails(
			input.request,
			context.translate("server:core.tools.documents.request.unpublish", {
				data: {
					collection:
						context.translate(collection.getData.details.labels.singular) ??
						collection.key,
					id: input.documentId,
					target: input.target,
				},
			}),
		),
	});
	if (requestRes.error) return requestRes;

	const { request } = requestRes.data;
	const linked = await linkReferences(context, {
		conversationId: props.conversationId,
		toolName: props.toolName,
		reference: { type: "request", requestId: request.id },
	});
	if (linked.error) return linked;

	return {
		error: undefined,
		data: {
			output: {
				outcome: "requested",
				document,
				request,
				links: { request: getRequestLink(context, request.id) },
			},
		},
	};
};

export default unpublishDocument;
