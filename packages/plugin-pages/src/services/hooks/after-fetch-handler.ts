import type { CollectionBuilder } from "@lucidcms/core";
import { formatDocumentRoute } from "@lucidcms/core/plugin";
import type {
	FieldInputSchema,
	InternalCollectionDocument,
	InternalDocumentField,
	LucidHookDocuments,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import getTargetCollection from "../get-target-collection.js";
import resolveParentFullSlug from "./helpers/resolve-parent-full-slug.js";

const snapshotVersionType = "snapshot";

const cloneFieldAsInput = (field: InternalDocumentField): FieldInputSchema => {
	const input: FieldInputSchema = {
		key: field.key,
		type: field.type as FieldInputSchema["type"],
	};

	if (field.translations !== undefined) {
		input.translations = { ...field.translations };
	}
	if (field.value !== undefined) {
		input.value = field.value;
	}

	return input;
};

const findField = (
	fields: InternalDocumentField[],
	key: string,
	type: InternalDocumentField["type"],
): InternalDocumentField | undefined => {
	return fields.find((field) => field.key === key && field.type === type);
};

/**
 * Replaces only the formatted fullSlug field on the fetched document. Snapshot
 * previews need an effective value, but the stored snapshot must remain frozen.
 */
const updateFullSlugField = (data: {
	document: InternalCollectionDocument;
	fullSlug: Record<string, string | null>;
	defaultLocale: string;
	collection: CollectionBuilder;
	locales: string[];
}): InternalCollectionDocument => {
	const document = {
		...data.document,
		fields:
			data.document.fields?.map((field) => {
				if (
					field.key !== constants.fields.fullSlug.key ||
					field.type !== "text"
				) {
					return field;
				}

				if (field.translations !== undefined) {
					return {
						...field,
						translations: {
							...field.translations,
							...data.fullSlug,
						},
					};
				}

				return {
					...field,
					value: data.fullSlug[data.defaultLocale] ?? null,
				};
			}) ?? null,
	};

	return {
		...document,
		route: formatDocumentRoute({
			collection: data.collection,
			documentId: document.id,
			fields: document.fields,
			locales: data.locales,
		}),
	};
};

/**
 * Derives pages fullSlug values for operation-backed snapshot reads using the
 * publish target version. This keeps scheduled-release previews aligned with
 * the environment they will publish to without persisting derived values that
 * would be unfilterable or stale as parent versions change.
 */
const afterFetchHandler =
	(
		options: PluginOptionsInternal,
	): LucidHookDocuments<"afterFetch">["handler"] =>
	async (context, data) => {
		if (data.data.versionType !== snapshotVersionType) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const targetCollectionRes = getTargetCollection({
			options,
			collectionKey: data.meta.collectionKey,
		});
		if (targetCollectionRes.error) {
			return {
				error: undefined,
				data: undefined,
			};
		}

		const documentResults = await Promise.all(
			data.data.documents.map(async (document) => {
				const fields = document.fields;
				if (!fields || fields.length === 0) {
					return { error: undefined, data: document };
				}

				const slugField = findField(fields, constants.fields.slug.key, "text");
				const parentPageField = findField(
					fields,
					constants.fields.parentPage.key,
					"relation",
				);
				const fullSlugField = findField(
					fields,
					constants.fields.fullSlug.key,
					"text",
				);

				if (!slugField || !parentPageField || !fullSlugField) {
					return { error: undefined, data: document };
				}

				const slug = cloneFieldAsInput(slugField);
				const parentPage = cloneFieldAsInput(parentPageField);

				const fullSlugRes = await resolveParentFullSlug(context, {
					collection: targetCollectionRes.data,
					collectionInstance: data.meta.collection,
					collectionKey: targetCollectionRes.data.key,
					versionType: data.data.relationVersionType,
					tables: data.meta.collectionTableNames,
					fields: {
						slug,
						parentPage,
						all: fields.map(cloneFieldAsInput),
					},
					missingParentIsEmpty: true,
				});
				if (fullSlugRes.error) return fullSlugRes;

				return {
					error: undefined,
					data: updateFullSlugField({
						document,
						fullSlug: fullSlugRes.data,
						defaultLocale: context.config.localization.defaultLocale,
						collection: data.meta.collection,
						locales: context.config.localization.locales.map(
							(locale) => locale.code,
						),
					}),
				};
			}),
		);
		const failedDocument = documentResults.find((result) => result.error);
		if (failedDocument?.error) return failedDocument;

		data.data.documents = documentResults.flatMap((result) =>
			result.data ? [result.data] : [],
		);

		return {
			error: undefined,
			data: undefined,
		};
	};

export default afterFetchHandler;
