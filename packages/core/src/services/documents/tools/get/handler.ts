import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getSingle from "../../content/get-single.js";
import getEditLink from "../../helpers/get-edit-link.js";
import {
	projectDocumentBricks,
	projectFieldMap,
	projectRoute,
	selectFields,
} from "../../helpers/project-document.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Reads one document with optional field and brick selection to bound large results. */
const getDocument: ServiceFn<
	[{ input: z.output<typeof inputSchema>; allowedCollectionKeys: string[] }],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const collection = context.config.collections.find(
		(candidate) => candidate.key === props.input.collectionKey,
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
		props.input.contentLocale,
	);
	if (localeRes.error) return localeRes;
	const contentLocale = localeRes.data;

	const documentRes = await getSingle(context, {
		collectionKey: props.input.collectionKey,
		versionType: props.input.version,
		query: {
			...props.input.query,
			filter: {
				...props.input.query.filter,
				id: { value: props.input.id },
			},
		},
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (documentRes.error) return documentRes;

	const document = documentRes.data.document;
	const bricks = paginate(
		projectDocumentBricks(document.bricks ?? [], contentLocale, collection),
		props.input.bricksPage,
		props.input.bricksPerPage,
	);

	return {
		error: undefined,
		data: {
			output: {
				data: {
					id: document.id,
					collectionKey: document.collectionKey,
					version: document.version,
					route: projectRoute(document.route, contentLocale),
					fields: projectFieldMap(
						selectFields(document.fields, props.input.fieldKeys),
						contentLocale,
						collection.contentFieldTree,
					),
					bricks: bricks.data,
					...(document.meta && { meta: document.meta }),
					links: {
						edit: getEditLink(
							context,
							props.input.collectionKey,
							props.input.version,
							document.id,
						),
					},
				},
				meta: {
					collectionKey: props.input.collectionKey,
					version: props.input.version,
					contentLocale,
					brickPagination: bricks.pagination,
					...(documentRes.data.refs && { refs: documentRes.data.refs }),
				},
			},
		},
	};
};

export default getDocument;
