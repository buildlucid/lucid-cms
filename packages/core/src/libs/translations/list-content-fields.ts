import type { FieldTypes } from "../../exports/types.js";
import type { BrickInputSchema } from "../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../schemas/collection-fields.js";
import type CustomField from "../collection/custom-fields/custom-field.js";
import type BrickDefinition from "../collection/definitions/brick/index.js";
import type CollectionDefinition from "../collection/definitions/collection/index.js";
import { getFieldSetState } from "../collection/definitions/fields/index.js";

/** Document content in the input shape saves take and stored reads return. */
export type ContentInput = {
	bricks?: BrickInputSchema[];
	fields?: FieldInputSchema[];
};

/** A field in document content, with where it sits and its definition. */
export type ContentField = {
	/** The brick's ref, or null for the document's own fields. */
	brick: string | null;
	/** Field keys and repeater item refs from the brick down to the field. */
	path: string[];
	field: FieldInputSchema;
	instance: CustomField<FieldTypes>;
	owner: CollectionDefinition | BrickDefinition;
};

/** Identifies a field across two versions of the same document's content. */
export const contentFieldId = (entry: Pick<ContentField, "brick" | "path">) =>
	`${entry.brick ?? ""}|${entry.path.join("/")}`;

/**
 * Lists every field in document content, including repeaters and the fields
 * in their items, skipping fields the collection or brick no longer defines.
 */
const listContentFields = (
	collection: CollectionDefinition,
	content: ContentInput,
): ContentField[] => {
	const entries: ContentField[] = [];

	const visit = (
		fields: FieldInputSchema[],
		owner: CollectionDefinition | BrickDefinition,
		brick: string | null,
		path: string[],
	) => {
		const instances = getFieldSetState(owner).fields;
		for (const field of fields) {
			const instance = instances.get(field.key);
			if (!instance) continue;

			const fieldPath = [...path, field.key];
			entries.push({ brick, path: fieldPath, field, instance, owner });
			for (const group of field.groups ?? []) {
				visit(group.fields, owner, brick, [...fieldPath, group.ref]);
			}
		}
	};

	visit(content.fields ?? [], collection, null, []);
	for (const brick of content.bricks ?? []) {
		const owner = collection.brickInstances.find(
			(instance) => instance.key === brick.key,
		);
		if (!owner) continue;
		visit(brick.fields ?? [], owner, brick.ref, []);
	}

	return entries;
};

export default listContentFields;
