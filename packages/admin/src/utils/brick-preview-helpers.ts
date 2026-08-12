import type { InternalDocumentField } from "@types";
import type {
	CollectionBrickConfig,
	CollectionDataFieldConfig,
	CollectionLeafFieldConfig,
} from "@/types/collection-config";
import { formatDocumentFieldValue } from "@/utils/document-table-helpers";
import helpers from "@/utils/helpers";
import { flattenStructuralScopeConfigs } from "@/utils/structural-field-helpers";

const brickPreviewFieldTypes = new Set<CollectionLeafFieldConfig["type"]>([
	"checkbox",
	"color",
	"datetime",
	"number",
	"select",
	"text",
	"textarea",
]);

export interface BrickPreviewField {
	key: string;
	label: string;
	value: string;
}

const isBrickPreviewField = (
	field: CollectionDataFieldConfig,
): field is CollectionLeafFieldConfig =>
	field.type !== "repeater" && brickPreviewFieldTypes.has(field.type);

/**
 * Builds a compact preview from top-level scalar brick fields. Structural
 * containers are transparent, while repeaters and reference-backed values are
 * intentionally excluded so the node remains predictable and inexpensive.
 */
export const getBrickPreviewFields = (props: {
	config?: CollectionBrickConfig;
	fields?: InternalDocumentField[];
	contentLocale: string;
	collectionLocalized: boolean;
}): BrickPreviewField[] => {
	if (!props.config || !props.fields) return [];

	return flattenStructuralScopeConfigs(props.config.fields)
		.filter(isBrickPreviewField)
		.filter((field) => field.ui?.hidden !== true)
		.map((field) => {
			const fieldData = props.fields?.find(
				(item) => item.key === field.key && item.groupRef === undefined,
			);
			const value = formatDocumentFieldValue({
				fieldConfig: field,
				fieldData,
				contentLocale: props.contentLocale,
				collectionLocalized: props.collectionLocalized,
			});
			if (!value) return null;

			return {
				key: field.key,
				label:
					helpers.getLocaleValue({
						value: field.details.label,
						fallback: field.key,
					}) || field.key,
				value,
			};
		})
		.filter((field): field is BrickPreviewField => field !== null);
};
