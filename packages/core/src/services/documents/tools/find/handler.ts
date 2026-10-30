import type z from "zod";
import type { FieldAccessActor } from "../../../../libs/collection/field-access/types.js";
import { copy } from "../../../../libs/i18n/index.js";
import { getPagination } from "../../../../libs/tools/pagination.js";
import type { ServiceFn } from "../../../../utils/services/types.js";
import getMultipleWithRefs from "../../content/get-multiple-with-refs.js";
import getEditLink from "../../helpers/get-edit-link.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import {
	projectFieldMap,
	projectRefs,
	projectRoute,
	selectFields,
} from "../helpers/project-document.js";
import type { inputSchema, outputSchema } from "./schema.js";

/** Finds readable documents with toolkit nested filters, excluding hidden fields from results, filters and sorts. */
const findDocuments: ServiceFn<
	[
		{
			input: z.output<typeof inputSchema>;
			allowedCollectionKeys: string[];
			/** Whose field permissions apply, with external integrations reading every field their scopes allow. */
			reader?: FieldAccessActor;
		},
	],
	{ output: z.output<typeof outputSchema> }
> = async (context, props) => {
	const collection = context.config.collections.find(
		(candidate) =>
			candidate.key === props.input.collectionKey &&
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
		props.input.contentLocale,
	);
	if (localeRes.error) return localeRes;
	const contentLocale = localeRes.data;

	const documentsRes = await getMultipleWithRefs(context, {
		collectionKey: props.input.collectionKey,
		versionType: props.input.version,
		query: props.input.query,
		allowedCollectionKeys: props.allowedCollectionKeys,
		reader: props.reader,
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
					...(documentsRes.data.refs && {
						refs: projectRefs(documentsRes.data.refs),
					}),
				},
			},
		},
	};
};

export default findDocuments;
