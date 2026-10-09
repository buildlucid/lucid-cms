import type z from "zod";
import constants from "../../../../constants/constants.js";
import { getDocumentShape } from "../../../../libs/collection/helpers/get-document-shape.js";
import { copy } from "../../../../libs/i18n/index.js";
import { documentEditableDataSchema } from "../../../../libs/toolkit/documents/authoring-values-schema.js";
import type { ToolkitActor } from "../../../../libs/toolkit/types.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getRequestLink from "../../../requests/helpers/get-request-link.js";
import loadRequest from "../../../requests/helpers/load-request.js";
import resolveActorUser from "../../../users/helpers/resolve-actor-user.js";
import getSingle from "../../content/get-single.js";
import getEditLink from "../../helpers/get-edit-link.js";
import { projectRoute, selectFields } from "../../helpers/project-document.js";
import projectEditableValue from "../../helpers/project-editable-value.js";
import readDocumentContent from "../../helpers/read-document-content.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import {
	type agentInputSchema,
	type outputSchema,
	parseRequestVersion,
} from "./schema.js";

/** Reads selected fields and bricks from a document or request proposal in the shape accepted by write tools. */
const getDocument: ServiceFn<
	[
		{
			input: z.output<typeof agentInputSchema>;
			allowedCollectionKeys: string[];
			/** Who reads request proposals. Only agent tools can read them. */
			actor?: ToolkitActor;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const { input } = props;
	const collection = context.config.collections.find(
		(candidate) => candidate.key === input.collectionKey,
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
	const contentLocale = localeRes.data;

	const requestId = props.actor
		? parseRequestVersion(input.version)
		: undefined;
	let proposal: { requestId: number; versionId: number } | undefined;
	if (requestId !== undefined && props.actor) {
		const userRes = await resolveActorUser(context, { actor: props.actor });
		if (userRes.error) return userRes;

		const requestRes = await loadRequest(context, {
			id: requestId,
			user: userRes.data,
		});
		if (requestRes.error) return requestRes;

		const versionId = requestRes.data.documents.find(
			(document) =>
				document.collection_key === input.collectionKey &&
				document.document_id === input.id &&
				document.source === "latest",
		)?.source_version_id;
		if (!versionId) {
			return {
				error: {
					type: "basic",
					message: copy("server:core.tools.documents.proposal.not.found", {
						data: {
							requestId,
							collection:
								context.translate(collection.getData.details.labels.singular) ??
								collection.key,
							id: input.id,
						},
					}),
					status: 404,
				},
				data: undefined,
			};
		}

		proposal = { requestId, versionId };
	}

	//* bricks come from the editable content below; the content read still includes them for their refs
	const documentRes = await getSingle(context, {
		collectionKey: input.collectionKey,
		versionType: proposal
			? constants.collectionBuilder.publishing.proposalVersionType
			: input.version,
		versionId: proposal?.versionId,
		includeRequestVersions: proposal !== undefined,
		query: { include: input.include, filter: { id: { value: input.id } } },
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (documentRes.error) return documentRes;

	const contentRes = await readDocumentContent(context, {
		collectionKey: input.collectionKey,
		id: input.id,
		version: proposal ? undefined : input.version,
		versionId: proposal?.versionId,
	});
	if (contentRes.error) return contentRes;

	const projected = documentEditableDataSchema.safeParse(
		projectEditableValue(
			getDocumentShape({
				collection,
				localization: context.config.localization,
			}),
			contentRes.data.data,
			contentLocale,
		),
	);
	if (!projected.success) {
		return {
			error: {
				type: "basic",
				message: copy("server:core.documents.authoring.structure.invalid"),
				status: 500,
				zod: projected.error,
			},
			data: undefined,
		};
	}

	const document = documentRes.data.document;
	const { fixed, builder, embedded } = projected.data.bricks;
	const bricks = paginate(
		input.include?.includes("bricks")
			? [
					...Object.entries(fixed).map(([key, fields]) => ({
						key,
						type: "fixed" as const,
						fields,
					})),
					...builder.map((brick) => ({ ...brick, type: "builder" as const })),
					...embedded.map((brick) => ({
						...brick,
						type: "embedded" as const,
					})),
				]
			: [],
		input.bricksPage,
		input.bricksPerPage,
	);

	return {
		error: undefined,
		data: {
			output: {
				data: {
					id: document.id,
					collectionKey: document.collectionKey,
					version: document.version,
					requestId: proposal?.requestId ?? null,
					route: projectRoute(document.route, contentLocale),
					fields: selectFields(projected.data.fields, input.fieldKeys),
					bricks: bricks.data,
					...(document.meta && { meta: document.meta }),
					links: {
						edit: proposal
							? getRequestLink(context, proposal.requestId, {
									collectionKey: input.collectionKey,
									documentId: document.id,
								})
							: getEditLink(
									context,
									input.collectionKey,
									input.version,
									document.id,
								),
					},
				},
				meta: {
					collectionKey: input.collectionKey,
					version: input.version,
					contentLocale,
					brickPagination: bricks.pagination,
					...(documentRes.data.refs && { refs: documentRes.data.refs }),
				},
			},
		},
	};
};

export default getDocument;
