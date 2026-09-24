import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { getPagination } from "../../../../libs/tools/pagination.js";
import getMultiple from "../../content/get-multiple.js";
import getEditLink from "../../helpers/get-edit-link.js";
import {
	projectDocumentBricks,
	projectFieldMap,
	projectRoute,
	selectFields,
} from "../../helpers/project-document.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Finds readable documents using the same nested filters as the toolkit. */
export const findDocumentsTool = defineTool({
	target: "mcp",
	name: "documents_find",
	description:
		"Find documents in a collection by content filters. Supports nested custom-field, brick and repeater filters.",
	input: inputSchema,
	output: outputSchema,
	scopes: [],
	requiredScopes: ({ collectionKey }) => [
		ExternalScopes.DocumentRead(collectionKey),
	],
	advertisedScopes: (config) =>
		config.collections.map((collection) =>
			ExternalScopes.DocumentRead(collection.key),
		),
	annotations: { readOnlyHint: true },
	handler: async ({ context, input, execution }) => {
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

		const documentsRes = await getMultiple(context, {
			collectionKey: input.collectionKey,
			versionType: input.version,
			query: input.query,
			externalScopes: execution.authority.scopes,
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
								input.fieldKeys ?? collection.labelFields,
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
								input.collectionKey,
								input.version,
								document.id,
							),
						},
					})),
					pagination: getPagination(
						documentsRes.data.count,
						input.query.page,
						input.query.perPage,
					),
					meta: {
						collectionKey: input.collectionKey,
						version: input.version,
						contentLocale,
						...(documentsRes.data.refs && { refs: documentsRes.data.refs }),
					},
				},
			},
		};
	},
});
