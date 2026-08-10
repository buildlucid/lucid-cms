import { extractEmbeddedBrickRefs } from "@lucidcms/rich-text";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import type CustomField from "../../../libs/collection/custom-fields/custom-field.js";
import registeredFields from "../../../libs/collection/custom-fields/registered-fields.js";
import { isStorageMode } from "../../../libs/collection/custom-fields/storage/index.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { Config, FieldInputSchema, FieldTypes } from "../../../types.js";

/**
 * - Processes fields to remove any that don't exist in the custom fields.
 * - Processes recursively for tree-table fields with nested groups.
 * - Based on collection and field translation support, sort out the fields translations/value props
 * - Normalizes the input value of the field using the custom field instance's normalizeInputValue method
 */
const processFields = (props: {
	collection: CollectionBuilder;
	fields: Array<FieldInputSchema>;
	customFields: Map<string, CustomField<FieldTypes>>;
	localization: Config["localization"];
}): Array<FieldInputSchema> => {
	return props.fields.flatMap((field) => {
		const cfInstance = props.customFields.get(field.key);
		if (!cfInstance) return [];
		const processedField = { ...field };
		const databaseConfig = registeredFields[cfInstance.type].config.database;

		if (processedField.value !== undefined) {
			processedField.value = cfInstance.normalizeInputValue(
				processedField.value,
			);
		}
		if (processedField.translations) {
			processedField.translations = Object.fromEntries(
				Object.entries(processedField.translations).map(
					([localeCode, value]) => [
						localeCode,
						cfInstance.normalizeInputValue(value),
					],
				),
			);
		}

		if (isStorageMode(databaseConfig, "tree-table") && field.groups) {
			processedField.groups = field.groups.map((group) => ({
				...group,
				fields: processFields({
					collection: props.collection,
					fields: group.fields,
					customFields: props.customFields,
					localization: props.localization,
				}),
			}));
		}

		// if collection uses translations and the field supports translations
		if (props.collection.getData.localized && cfInstance.localizedEnabled) {
			// if processField.value is given only and no translations key - add the value to the translations object with the locale object key being the default locale
			if (processedField.value !== undefined && !processedField.translations) {
				processedField.translations = {
					[props.localization.defaultLocale]: processedField.value,
				};
				processedField.value = undefined;
			}
		} else {
			// if processField.translations is given, take the default locale translation value and set it as the processField.value
			if (processedField.translations && processedField.value === undefined) {
				const translationValue =
					processedField.translations[props.localization.defaultLocale];
				processedField.value = translationValue;
				processedField.translations = undefined;
			}
		}

		return [processedField];
	});
};

/** Finds embedded-brick refs recursively in rich-text values and repeater groups. */
const getEmbeddedBrickRefsFromFields = (
	fields: Array<FieldInputSchema>,
): Set<string> => {
	const refs = new Set<string>();
	const visit = (field: FieldInputSchema) => {
		if (field.type === "rich-text") {
			for (const ref of extractEmbeddedBrickRefs(
				(field.value as Parameters<typeof extractEmbeddedBrickRefs>[0]) ?? null,
			)) {
				refs.add(ref);
			}
			for (const value of Object.values(field.translations ?? {})) {
				for (const ref of extractEmbeddedBrickRefs(
					(value as Parameters<typeof extractEmbeddedBrickRefs>[0]) ?? null,
				)) {
					refs.add(ref);
				}
			}
		}

		for (const group of field.groups ?? []) {
			for (const child of group.fields) visit(child);
		}
	};

	for (const field of fields) visit(field);
	return refs;
};

/** Resolves reachable embedded bricks and refs involved in a reference cycle. */
export const analyzeEmbeddedBrickGraph = (props: {
	fields: Array<FieldInputSchema>;
	bricks: Array<BrickInputSchema>;
}) => {
	const embeddedByRef = new Map(
		props.bricks
			.filter((brick) => brick.type === "embedded")
			.map((brick) => [brick.ref, brick]),
	);
	const rootRefs = getEmbeddedBrickRefsFromFields([
		...props.fields,
		...props.bricks
			.filter((brick) => brick.type !== "embedded")
			.flatMap((brick) => brick.fields ?? []),
	]);
	const reachable = new Set<string>();
	const cyclic = new Set<string>();
	const visited = new Set<string>();
	const stack: string[] = [];
	const visiting = new Set<string>();

	const visit = (ref: string) => {
		reachable.add(ref);
		if (visited.has(ref)) return;
		if (visiting.has(ref)) {
			const cycleStart = stack.indexOf(ref);
			for (const cycleRef of stack.slice(cycleStart)) cyclic.add(cycleRef);
			return;
		}

		const brick = embeddedByRef.get(ref);
		if (!brick) return;

		visiting.add(ref);
		stack.push(ref);
		for (const nestedRef of getEmbeddedBrickRefsFromFields(
			brick.fields ?? [],
		)) {
			visit(nestedRef);
		}
		stack.pop();
		visiting.delete(ref);
		visited.add(ref);
	};

	for (const ref of rootRefs) visit(ref);
	return { reachable, cyclic };
};

/** Keeps only embedded bricks reachable from submitted document content. */
export const filterReachableEmbeddedBricks = (props: {
	fields: Array<FieldInputSchema>;
	bricks: Array<BrickInputSchema>;
}): Array<BrickInputSchema> => {
	const { reachable } = analyzeEmbeddedBrickGraph(props);

	return props.bricks.filter(
		(brick) => brick.type !== "embedded" || reachable.has(brick.ref),
	);
};

/**
 * Prepares bricks and fields by removing invalid fields that don't exist in custom fields.
 */
const prepareBricksAndFields = (props: {
	collection: CollectionBuilder;
	bricks?: Array<BrickInputSchema>;
	fields?: Array<FieldInputSchema>;
	localization: Config["localization"];
}) => {
	// Process collection fields
	const preparedFields = props.fields
		? processFields({
				collection: props.collection,
				fields: props.fields,
				customFields: props.collection.fields,
				localization: props.localization,
			})
		: undefined;

	// Process brick fields
	const processedBricks = props.bricks
		? props.bricks.map((brick) => {
				const brickDefinition = props.collection.brickInstances.find(
					(b) => b.key === brick.key,
				);
				if (!brickDefinition || !brick.fields) return brick;

				// Process fields for this brick
				const processedFields = processFields({
					collection: props.collection,
					fields: brick.fields,
					customFields: brickDefinition.fields,
					localization: props.localization,
				});

				return {
					...brick,
					fields: processedFields,
				};
			})
		: undefined;
	const preparedBricks = processedBricks
		? filterReachableEmbeddedBricks({
				fields: preparedFields ?? [],
				bricks: processedBricks,
			})
		: undefined;

	return {
		preparedBricks,
		preparedFields,
	};
};

export default prepareBricksAndFields;
