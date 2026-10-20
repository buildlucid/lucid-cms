import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import type { ToolkitActor } from "../../../../libs/permission/toolkit-actor.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getRequestLink from "../../../requests/helpers/get-request-link.js";
import getSingleWithRefs from "../../content/get-single-with-refs.js";
import getEditLink from "../../helpers/get-edit-link.js";
import projectEditableDocument from "../../helpers/project-editable-document.js";
import readDocumentContent from "../../helpers/read-document-content.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import { projectRefs, projectRoute } from "../helpers/project-document.js";
import projectMeta from "../helpers/project-meta.js";
import resolveVersion from "./resolve-version.js";
import type { agentInputSchema, outputSchema } from "./schema.js";

/** Reads document versions and request proposals as selected fields and bricks in the shape accepted by write tools. */
const getDocument: ServiceFn<
	[
		{
			input: z.output<typeof agentInputSchema>;
			allowedCollectionKeys: string[];
			/** The reader for pinned versions, available only to agent tools. */
			actor?: ToolkitActor;
		},
	],
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
	const contentLocale = localeRes.data;

	const versionRes = props.actor
		? await resolveVersion(context, {
				collectionKey: input.collectionKey,
				collectionLabel:
					context.translate(collection.getData.details.labels.singular) ??
					collection.key,
				documentId: input.documentId,
				version: input.version,
				actor: props.actor,
			})
		: undefined;
	if (versionRes?.error) return versionRes;
	const pinned = versionRes?.data;
	const requestId = pinned?.requestId ?? null;

	//* bricks come from the editable content below; the content read still includes them for their refs
	const documentRes = await getSingleWithRefs(context, {
		collectionKey: input.collectionKey,
		versionType: pinned?.versionType ?? input.version,
		versionId: pinned?.versionId ?? undefined,
		includeRequestVersions: requestId !== null,
		query: {
			include: input.include,
			filter: { id: { value: input.documentId } },
		},
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (documentRes.error) return documentRes;

	const contentRes = await readDocumentContent(context, {
		collectionKey: input.collectionKey,
		id: input.documentId,
		version: pinned?.versionType ?? input.version,
		versionId: pinned?.versionId ?? undefined,
	});
	if (contentRes.error) return contentRes;

	const projected = projectEditableDocument(
		{ collection, localization: context.config.localization },
		{
			data: contentRes.data.data,
			contentLocale,
			fieldKeys: input.fieldKeys,
			includeBricks: input.include?.includes("bricks") === true,
			bricksPage: input.bricksPage,
			bricksPerPage: input.bricksPerPage,
		},
	);
	if (projected.error) return projected;

	const document = documentRes.data.document;
	const metaRes = document.meta
		? await projectMeta(context, { meta: document.meta })
		: undefined;
	if (metaRes?.error) return metaRes;

	return {
		error: undefined,
		data: {
			output: {
				data: {
					id: document.id,
					collectionKey: document.collectionKey,
					version: document.version,
					requestId,
					route: projectRoute(document.route, contentLocale),
					fields: projected.data.fields,
					bricks: projected.data.bricks,
					...(metaRes && { meta: metaRes.data }),
					links: {
						edit:
							requestId !== null
								? getRequestLink(context, requestId, {
										collectionKey: input.collectionKey,
										documentId: document.id,
									})
								: getEditLink(
										context,
										input.collectionKey,
										pinned?.versionType ?? input.version,
										document.id,
										pinned?.versionId ?? undefined,
									),
					},
				},
				meta: {
					collectionKey: input.collectionKey,
					version: input.version,
					contentLocale,
					brickPagination: projected.data.brickPagination,
					...(documentRes.data.refs && {
						refs: projectRefs(documentRes.data.refs),
					}),
				},
			},
		},
	};
};

export default getDocument;
