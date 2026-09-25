import type z from "zod";
import { copy } from "../../../../libs/i18n/index.js";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMultiple from "../../content/get-multiple.js";
import getEditLink from "../../helpers/get-edit-link.js";
import {
	projectDocumentBricks,
	projectFieldMap,
	projectRoute,
	selectFields,
} from "../../helpers/project-document.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Finds readable documents using the same nested filters as the toolkit. */
const findDocuments: ServiceFn<
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

	const documentsRes = await getMultiple(context, {
		collectionKey: props.input.collectionKey,
		versionType: props.input.version,
		query: props.input.query,
		allowedCollectionKeys: props.allowedCollectionKeys,
	});
	if (documentsRes.error) return documentsRes;

	return {
		error: undefined,
		data: {
			output: {
				data: documentsRes.data.documents.map((document) => ({
					id: document.id,
					collectionKey: document.collectionKey,
					version: document.version,
					route: projectRoute(document.route, contentLocale),
					fields: projectFieldMap(
						selectFields(
							document.fields,
							props.input.fieldKeys ?? collection.labelFields,
						),
						contentLocale,
						collection.contentFieldTree,
					),
					...(document.bricks && {
						bricks: projectDocumentBricks(
							document.bricks,
							contentLocale,
							collection,
						),
					}),
					links: {
						edit: getEditLink(
							context,
							props.input.collectionKey,
							props.input.version,
							document.id,
						),
					},
				})),
				pagination: getPagination(
					documentsRes.data.count,
					props.input.query.page,
					props.input.query.perPage,
				),
				meta: {
					collectionKey: props.input.collectionKey,
					version: props.input.version,
					contentLocale,
					...(documentsRes.data.refs && { refs: documentsRes.data.refs }),
				},
			},
		},
	};
};

export default findDocuments;
