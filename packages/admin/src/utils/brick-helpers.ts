import type {
	BrickError,
	CFConfig,
	CollectionResponse,
	DocumentRef,
	DocumentResponse,
	FieldAltResponse,
	FieldError,
	FieldRefs,
	FieldResponse,
	FieldTypes,
} from "@types";
import { nanoid } from "nanoid";
import brickStore from "@/store/brickStore";

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

/**
 * Returns the ref for a given field value and type
 */
const getFieldRef = <T extends FieldRefs>(props: {
	fieldType: "media" | "document" | "user";
	fieldValue: number | null | undefined;
	collection?: string;
}): T | undefined => {
	if (props.fieldValue === null || props.fieldValue === undefined)
		return undefined;

	const refs = brickStore.get.refs[props.fieldType] as T[] | undefined;
	if (!refs) return undefined;

	return refs.find((ref) => {
		if (!ref) return false;

		if (props.fieldType === "document" && props.collection) {
			return (
				ref.id === props.fieldValue &&
				(ref as DocumentRef).collectionKey === props.collection
			);
		}

		return ref.id === props.fieldValue;
	}) as T | undefined;
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

/**
 * Creates a stable identity key used to match incoming bricks to existing
 * store bricks during same-view sync operations.
 */
const getBrickSyncKey = (brick: {
	type: "builder" | "fixed" | "collection-fields";
	key: string;
	order: number;
}): string => {
	if (brick.type === "collection-fields") return "collection-pseudo-brick";
	if (brick.type === "fixed") return `fixed:${brick.key}`;
	return `builder:${brick.key}:${brick.order}`;
};

/**
 * Recursively preserves repeater group open states from the current store
 * fields while applying fresh field values from the server response.
 */
const preserveRepeaterGroupOpenState = (
	nextFields: FieldResponse[] = [],
	currentFields: FieldResponse[] = [],
): FieldResponse[] => {
	const currentFieldsByKey = new Map(
		currentFields.map((field) => [field.key, field]),
	);

	for (const nextField of nextFields) {
		if (nextField.type !== "repeater" || !nextField.groups) continue;

		const currentField = currentFieldsByKey.get(nextField.key);
		const currentGroups =
			currentField?.type === "repeater" ? currentField.groups || [] : [];
		const currentGroupsByRef = new Map(
			currentGroups.map((group) => [group.ref, group]),
		);

		nextField.groups = nextField.groups.map((nextGroup) => {
			const currentGroup = currentGroupsByRef.get(nextGroup.ref);
			return {
				...nextGroup,
				open: currentGroup?.open ?? nextGroup.open,
				fields: preserveRepeaterGroupOpenState(
					nextGroup.fields || [],
					currentGroup?.fields || [],
				),
			};
		});
	}

	return nextFields;
};

/**
 * Builds the brick store payload from a document response, including the
 * collection pseudo brick and any missing fixed brick placeholders.
 */
const buildBricks = (props: {
	document?: DocumentResponse;
	collection?: CollectionResponse;
}): Array<{
	ref: string;
	key: string;
	order: number;
	type: "builder" | "fixed" | "collection-fields";
	open: boolean;
	fields: FieldResponse[];
}> => {
	const documentBricks = structuredClone(props.document?.bricks) || [];
	const collectionFields = structuredClone(props.document?.fields) || [];
	const bricks = [
		{
			ref: "collection-pseudo-brick",
			key: "collection-pseudo-brick",
			order: -1,
			type: "collection-fields" as const,
			open: false,
			fields: collectionFields,
		},
		...documentBricks,
	];

	for (const fixedBrick of props.collection?.fixedBricks || []) {
		const hasFixedBrick = bricks.some(
			(brick) => brick.key === fixedBrick.key && brick.type === "fixed",
		);
		if (hasFixedBrick) continue;

		bricks.push({
			id: -1,
			ref: nanoid(),
			key: fixedBrick.key,
			fields: [],
			type: "fixed",
			open: false,
			order: -1,
		});
	}

	return bricks;
};

// ---------------------------------------------
// Exports
const brickHelpers = {
	findFieldRecursive,
	getCollectionPseudoBrickFields,
	getUpsertBricks,
	customFieldId,
	getFieldValue,
	getFieldRef,
	hasErrorsOnOtherLocale,
	objectifyFields,
	getBrickSyncKey,
	preserveRepeaterGroupOpenState,
	buildBricks,
};

export default brickHelpers;
