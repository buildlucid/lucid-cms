import type {
	FieldInputSchema,
	InternalCollectionDocument,
	InternalDocumentField,
	LucidHookDocuments,
} from "@lucidcms/core/types";
import constants from "../../constants.js";
import type { PluginOptionsInternal } from "../../types/types.js";
import getParentPageId from "../../utils/get-parent-page-id.js";
import constructParentFullSlug from "../construct-parent-fullslug.js";
import getParentFields, {
	type ParentPageQueryResponse,
} from "../get-parent-fields.js";
import getTargetCollection from "../get-target-collection.js";

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
}): InternalCollectionDocument => {
	return {
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

		const documents: InternalCollectionDocument[] = [];

		for (const document of data.data.documents) {
			const fields = document.fields;
			if (!fields || fields.length === 0) {
				documents.push(document);
				continue;
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
				documents.push(document);
				continue;
			}

			const slug = cloneFieldAsInput(slugField);
			const parentPage = cloneFieldAsInput(parentPageField);

			let parentFieldsData: Array<ParentPageQueryResponse> = [];
			const parentPageId = getParentPageId(parentPage);

			if (parentPageId !== null) {
				const parentFieldsRes = await getParentFields(context, {
					defaultLocale: context.config.localization.defaultLocale,
					versionType: data.data.relationVersionType,
					collectionKey: targetCollectionRes.data.collection,
					tenantKey: data.meta.tenantKey,
					fields: {
						parentPage,
					},
					tables: data.meta.collectionTableNames,
					missingParentIsEmpty: true,
				});
				if (parentFieldsRes.error) return parentFieldsRes;

				parentFieldsData = parentFieldsRes.data;
			}

			const fullSlugRes = constructParentFullSlug({
				parentFields: parentFieldsData,
				localization: context.config.localization,
				collection: targetCollectionRes.data,
				fields: {
					slug,
				},
			});
			if (fullSlugRes.error) return fullSlugRes;

			documents.push(
				updateFullSlugField({
					document,
					fullSlug: fullSlugRes.data,
					defaultLocale: context.config.localization.defaultLocale,
				}),
			);
		}

		data.data.documents = documents;

		return {
			error: undefined,
			data: undefined,
		};
	};

export default afterFetchHandler;
