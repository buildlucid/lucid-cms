import brickStore from "@/store/brickStore";
import type {
	CFConfig,
	FieldTypes,
	FieldResponse,
	FieldResponseMeta,
	FieldError,
	BrickError,
	FieldAltResponse,
} from "@types";

const findFieldRecursive = (props: {
	fields: FieldResponse[];
	targetKey: string;
	groupRef?: string;
	repeaterKey?: string;
}): FieldResponse | null => {
	for (const field of props.fields) {
		// Direct match for top-level fields if no repeater key is specified
		if (
			!props.repeaterKey &&
			field.key === props.targetKey &&
			(!field.groupRef || field.groupRef === props.groupRef)
		) {
			return field;
		}

		// If looking within a specific repeater field
		if (
			props.repeaterKey &&
			field.key === props.repeaterKey &&
			field.type === "repeater" &&
			field.groups
		) {
			for (const group of field.groups) {
				if (!props.groupRef || group.ref === props.groupRef) {
					// Group ID check is here if specified
					for (const subField of group.fields) {
						if (
							subField.key === props.targetKey &&
							(!subField.groupRef || subField.groupRef === props.groupRef)
						) {
							return subField;
						}
						// Recursive check in case of nested repeater fields
						if (subField.type === "repeater") {
							const found = findFieldRecursive({
								fields: subField.groups?.flatMap((g) => g.fields) || [],
								targetKey: props.targetKey,
								groupRef: props.groupRef,
								repeaterKey: props.repeaterKey,
							});
							if (found) return found;
						}
					}
				}
			}
		} else if (field.groups) {
			// Check recursively in other repeater fields
			const found = findFieldRecursive({
				fields: field.groups.flatMap((g) => g.fields),
				targetKey: props.targetKey,
				groupRef: props.groupRef,
				repeaterKey: props.repeaterKey,
			});
			if (found) return found;
		}
	}
	return null;
};

const getCollectionPseudoBrickFields = () => {
	const pseudoBrick = brickStore.get.bricks.find(
		(b) => b.type === "collection-fields",
	);
	if (!pseudoBrick) return [];
	return pseudoBrick.fields;
};

const getUpsertBricks = () =>
	brickStore.get.bricks.filter((b) => b.type !== "collection-fields");

const customFieldId = (props: {
	key: string;
	brickIndex: number;
	groupRef?: string;
}): string => {
	if (props.groupRef === undefined) {
		return `field-${props.key}-${props.brickIndex}`;
	}
	return `field-${props.key}-${props.brickIndex}-${props.groupRef}`;
};

const getFieldValue = <T>(props: {
	fieldConfig: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
	fieldData?: FieldResponse;
	contentLocale: string;
	collectionTranslations?: boolean;
}) => {
	if (!props.fieldData) return undefined;

	const collectionTranslations =
		props.collectionTranslations ?? brickStore.get.collectionTranslations;

	if (
		props.fieldConfig.config.useTranslations === true &&
		collectionTranslations === true
	) {
		return props.fieldData.translations?.[props.contentLocale] as T;
	}
	return props.fieldData.value as T;
};

const getFieldMeta = <T extends FieldResponseMeta>(props: {
	fieldConfig: CFConfig<Exclude<FieldTypes, "repeater" | "tab">>;
	fieldData?: FieldResponse;
	contentLocale: string;
	collectionTranslations?: boolean;
}) => {
	if (!props.fieldData) return undefined;

	const collectionTranslations =
		props.collectionTranslations ?? brickStore.get.collectionTranslations;

	if (
		props.fieldConfig.config.useTranslations === true &&
		collectionTranslations === true
	) {
		return (props.fieldData.meta as Record<string, T>)?.[props.contentLocale];
	}
	return props.fieldData.meta as T;
};

/**
 * Recursively checks field and brick errors for any that are of a differetn locale to the current one
 */
const hasErrorsOnOtherLocale = (props: {
	currentLocale: string;
	fieldErrors: FieldError[];
	brickErrors: BrickError[];
}) => {
	const hasFieldErrors = (field: FieldError): boolean => {
		if (
			field.localeCode !== undefined &&
			field.localeCode !== props.currentLocale
		) {
			return true;
		}

		if (field.groupErrors?.length) {
			return field.groupErrors.some((groupError) =>
				groupError.fields.some((nestedField) => hasFieldErrors(nestedField)),
			);
		}

		return false;
	};

	if (props.fieldErrors.some(hasFieldErrors)) {
		return true;
	}

	return props.brickErrors.some((brick) => brick.fields.some(hasFieldErrors));
};

/**
 * Converts a FieldResponse array into a FieldAltResponse object
 */
const objectifyFields = (
	fields: FieldResponse[],
): Record<string, FieldAltResponse> => {
	return fields.reduce(
		(acc, field) => {
			if (!field) return acc;

			acc[field.key] = {
				...field,
				groups: field.groups?.map((g) => {
					return {
						...g,
						fields: objectifyFields(g.fields || []),
					};
				}),
			} satisfies FieldAltResponse;
			return acc;
		},
		{} as Record<string, FieldAltResponse>,
	);
};

// ---------------------------------------------
// Exports
const brickHelpers = {
	findFieldRecursive,
	getCollectionPseudoBrickFields,
	getUpsertBricks,
	customFieldId,
	getFieldValue,
	getFieldMeta,
	hasErrorsOnOtherLocale,
	objectifyFields,
};

export default brickHelpers;
