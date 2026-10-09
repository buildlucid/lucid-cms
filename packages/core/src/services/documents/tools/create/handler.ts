import type z from "zod";
import { getDocumentShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import { getCollectionPermission } from "../../../../libs/permission/collection-permissions.js";
import { Permissions } from "../../../../libs/permission/definitions.js";
import hasAccess from "../../../../libs/permission/has-access.js";
import { documentDataSchema } from "../../../../libs/toolkit/documents/authoring-values-schema.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getRequestLink from "../../../requests/helpers/get-request-link.js";
import expandProjectedValue from "../../helpers/expand-projected-value.js";
import getEditLink from "../../helpers/get-edit-link.js";
import resolveActorUser from "../../helpers/resolve-actor-user.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import writeSingle from "../../write-single.js";
import linkReferences from "../helpers/link-references.js";
import requestDetails from "../helpers/request-details.js";
import type { DocumentWriteToolProps } from "../types.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Creates a document, as a create request unless direct writes are allowed and the collection doesn't require review. */
const createDocument: ServiceFn<
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
	const requested =
		!props.direct || collection.getData.publishing.review?.create === true;
	if (
		!hasAccess({
			user,
			requiredPermissions: [
				requested
					? Permissions.RequestsRead
					: getCollectionPermission(collection.key, "create"),
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

	const fixedKeys = new Set(
		collection.config.bricks?.fixed?.map((brick) => brick.key),
	);
	const bricks = input.bricks ?? [];
	const data = documentDataSchema.safeParse(
		expandProjectedValue(
			getDocumentShape({
				collection,
				localization: context.config.localization,
			}),
			{
				fields: input.fields ?? {},
				bricks: {
					fixed: Object.fromEntries(
						bricks
							.filter((brick) => fixedKeys.has(brick.key))
							.map((brick) => [brick.key, brick.fields ?? {}]),
					),
					builder: bricks
						.filter((brick) => !fixedKeys.has(brick.key))
						.map((brick) => ({
							key: brick.key,
							fields: brick.fields ?? {},
						})),
				},
			},
			localeRes.data,
		),
	);
	if (!data.success) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.authoring.structure.invalid"),
				status: 400,
				zod: data.error,
			},
			data: undefined,
		};
	}

	const collectionLabel =
		context.translate(collection.getData.details.labels.singular) ??
		collection.key;
	const written = await writeSingle(context, {
		kind: "create",
		collectionKey: collection.key,
		userId: user.id,
		authUser: user,
		agentRunId: props.actor.agentRunId,
		data: data.data,
		request: requested
			? requestDetails(
					input.request,
					context.translate("server:core.tools.documents.request.create", {
						data: { collection: collectionLabel },
					}),
				)
			: undefined,
	});
	if (written.error) return written;

	const { id, requestId } = written.data;
	const linked = await linkReferences(context, {
		conversationId: props.conversationId,
		toolName: props.toolName,
		reference:
			requestId === undefined
				? {
						type: "document",
						collectionKey: collection.key,
						documentId: id,
					}
				: { type: "request", requestId },
	});
	if (linked.error) return linked;

	return {
		error: undefined,
		data: {
			output: {
				outcome: requestId === undefined ? "applied" : "requested",
				document: { collectionKey: collection.key, id },
				request:
					requestId === undefined ? null : { id: requestId, type: "create" },
				links:
					requestId === undefined
						? { edit: getEditLink(context, collection.key, "latest", id) }
						: { request: getRequestLink(context, requestId) },
			},
		},
	};
};

export default createDocument;
