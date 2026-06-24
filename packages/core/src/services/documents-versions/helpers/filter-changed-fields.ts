import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";

type JsonValue =
	| null
	| boolean
	| number
	| string
	| JsonValue[]
	| { [key: string]: JsonValue };

const toComparableValue = (value: unknown): JsonValue => {
	if (value === undefined) return { __lucidUndefined: true };
	if (value === null) return null;
	if (typeof value !== "object") return value as JsonValue;
	if (Array.isArray(value)) return value.map((item) => toComparableValue(item));

	const entries = Object.entries(value as Record<string, unknown>).sort(
		([left], [right]) => left.localeCompare(right),
	);

	return Object.fromEntries(
		entries.map(([key, entryValue]) => [key, toComparableValue(entryValue)]),
	) as JsonValue;
};

const valuesEqual = (left: unknown, right: unknown) => {
	return (
		JSON.stringify(toComparableValue(left)) ===
		JSON.stringify(toComparableValue(right))
	);
};

const fieldValuesChanged = (
	original: FieldInputSchema | undefined,
	transformed: FieldInputSchema,
) => {
	if (!original) {
		return (
			transformed.value !== undefined || transformed.translations !== undefined
		);
	}

	if (original.type !== transformed.type) return true;
	if (!valuesEqual(original.value, transformed.value)) return true;
	if (!valuesEqual(original.translations, transformed.translations))
		return true;

	return false;
};

const filterChangedFields = (
	originalFields: FieldInputSchema[] | undefined,
	transformedFields: FieldInputSchema[] | undefined,
): FieldInputSchema[] => {
	if (!transformedFields) return [];

	const original = originalFields ?? [];

	return transformedFields.flatMap((transformedField) => {
		const originalField = original.find(
			(field) => field.key === transformedField.key,
		);

		if (transformedField.type !== "repeater") {
			return fieldValuesChanged(originalField, transformedField)
				? [transformedField]
				: [];
		}

		const changedGroups = (transformedField.groups ?? []).flatMap(
			(transformedGroup) => {
				const originalGroup = originalField?.groups?.find(
					(group) => group.ref === transformedGroup.ref,
				);
				const changedFields = filterChangedFields(
					originalGroup?.fields,
					transformedGroup.fields,
				);

				if (changedFields.length === 0) return [];

				return [
					{
						...transformedGroup,
						fields: changedFields,
					},
				];
			},
		);

		if (changedGroups.length === 0) return [];

		return [
			{
				...transformedField,
				groups: changedGroups,
			},
		];
	});
};

/** Returns transformed field values that changed during draft checks. */
const filterChangedDraftFields = (props: {
	originalBricks?: BrickInputSchema[];
	originalFields?: FieldInputSchema[];
	transformedBricks: BrickInputSchema[];
	transformedFields: FieldInputSchema[];
}) => {
	const fields = filterChangedFields(
		props.originalFields,
		props.transformedFields,
	);

	const bricks = props.transformedBricks.flatMap((transformedBrick) => {
		const originalBrick = props.originalBricks?.find((brick) => {
			if (brick.type !== transformedBrick.type) return false;
			if (brick.key !== transformedBrick.key) return false;
			return brick.ref === transformedBrick.ref;
		});
		const changedFields = filterChangedFields(
			originalBrick?.fields,
			transformedBrick.fields,
		);

		if (changedFields.length === 0) return [];

		return [
			{
				...transformedBrick,
				fields: changedFields,
			},
		];
	});

	return {
		bricks,
		fields,
	};
};

export default filterChangedDraftFields;
