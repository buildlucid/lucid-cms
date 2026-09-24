import { copy } from "../../../../libs/i18n/index.js";
import { ExternalScopes } from "../../../../libs/permission/external-scopes.js";
import defineTool from "../../../../libs/tools/define-tool.js";
import { paginate } from "../../../../libs/tools/pagination.js";
import getSingle from "../../content/get-single.js";
import getEditLink from "../../helpers/get-edit-link.js";
import {
	projectDocumentBricks,
	projectFieldMap,
	projectRoute,
	selectFields,
} from "../../helpers/project-document.js";
import resolveContentLocale from "../../helpers/resolve-content-locale.js";
import { inputSchema, outputSchema } from "./schema.js";

/** Reads one document with optional field and brick selection to bound large results. */
export const getDocumentTool = defineTool({
	target: "mcp",
	name: "documents_get",
	description: "Read one document and its selected content fields and bricks.",
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

		const documentRes = await getSingle(context, {
			collectionKey: input.collectionKey,
			versionType: input.version,
			query: {
				...input.query,
				filter: {
					...input.query.filter,
					id: { value: input.id },
				},
			},
			externalScopes: execution.authority.scopes,
		});
		if (documentRes.error) return documentRes;

		const document = documentRes.data.document;
		const bricks = paginate(
			projectDocumentBricks(document.bricks ?? [], contentLocale, collection),
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
						route: projectRoute(document.route, contentLocale),
						fields: projectFieldMap(
							selectFields(document.fields, input.fieldKeys),
							contentLocale,
							collection.contentFieldTree,
						),
						bricks: bricks.data,
						...(document.meta && { meta: document.meta }),
						links: {
							edit: getEditLink(
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
	},
});
