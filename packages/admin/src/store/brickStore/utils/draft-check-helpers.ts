import type {
	DocumentVersionCheckResponse,
	InternalDocumentField,
} from "@types";

type DraftCheckField = DocumentVersionCheckResponse["fields"][number];

/** Converts check response fields into builder-store field objects. */
const normalizeDraftCheckField = (
	field: DraftCheckField,
): InternalDocumentField => {
	return {
		key: field.key,
		type: field.type,
		value: field.value,
		translations: field.translations,
		groupRef: field.groupRef,
		groups: field.groups?.map((group, groupIndex) => ({
			ref: group.ref,
			open: group.open ?? false,
			order: group.order ?? groupIndex,
			fields: group.fields.map((groupField) =>
				normalizeDraftCheckField(groupField),
			),
		})),
	} as InternalDocumentField;
};

/** Merges normalized check fields while preserving untouched repeater groups. */
const mergeNormalizedDraftCheckFields = (
	fields: Array<InternalDocumentField>,
	nextFields: Array<InternalDocumentField>,
) => {
	nextFields.forEach((normalizedField) => {
		const existingIndex = fields.findIndex(
			(field) =>
				field.key === normalizedField.key &&
				(field.groupRef ?? null) === (normalizedField.groupRef ?? null),
		);

		if (existingIndex === -1) {
			fields.push(normalizedField);
			return;
		}

		const existingField = fields[existingIndex];

		if (
			existingField.type === "repeater" &&
			normalizedField.type === "repeater" &&
			normalizedField.groups !== undefined
		) {
			const existingGroups = existingField.groups ?? [];
			const mergedGroups = [...existingGroups];

			normalizedField.groups.forEach((nextGroup) => {
				const existingGroupIndex = mergedGroups.findIndex(
					(group) => group.ref === nextGroup.ref,
				);

				if (existingGroupIndex === -1) {
					mergedGroups.push(nextGroup);
					return;
				}

				const existingGroup = mergedGroups[existingGroupIndex];
				const mergedGroupFields = [...existingGroup.fields];

				mergeNormalizedDraftCheckFields(mergedGroupFields, nextGroup.fields);

				mergedGroups[existingGroupIndex] = {
					...existingGroup,
					...nextGroup,
					open: existingGroup.open ?? nextGroup.open,
					fields: mergedGroupFields,
				};
			});

			fields[existingIndex] = {
				...existingField,
				...normalizedField,
				groups: mergedGroups,
			} as InternalDocumentField;

			return;
		}

		fields[existingIndex] = {
			...existingField,
			...normalizedField,
		} as InternalDocumentField;
	});
};

/** Merges check response fields into existing builder-store field state. */
export const mergeDraftCheckFields = (
	fields: Array<InternalDocumentField>,
	nextFields: Array<DraftCheckField>,
) => {
	mergeNormalizedDraftCheckFields(
		fields,
		nextFields.map((field) => normalizeDraftCheckField(field)),
	);
};
