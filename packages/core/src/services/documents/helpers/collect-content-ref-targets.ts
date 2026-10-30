import type BrickBuilder from "../../../libs/collection/builders/brick-builder/index.js";
import type CollectionBuilder from "../../../libs/collection/builders/collection-builder/index.js";
import { getFieldBuilderState } from "../../../libs/collection/builders/field-builder/index.js";
import fieldConfigs from "../../../libs/collection/custom-fields/field-configs.js";
import { normalizeStoredRelationCustomFieldValues } from "../../../libs/collection/custom-fields/fields/relation/utils/relation-field-values.js";
import buildTableName from "../../../libs/collection/helpers/build-table-name.js";
import {
	emailsTable,
	mediaTable,
	usersTable,
} from "../../../libs/db/tables/index.js";
import type { FieldRefResource, RefTarget } from "../../../libs/refs/types.js";
import type { BrickInputSchema } from "../../../schemas/collection-bricks.js";
import type { FieldInputSchema } from "../../../schemas/collection-fields.js";

const idTables = {
	media: mediaTable.name,
	users: usersTable.name,
	emails: emailsTable.name,
};

const ids = (value: unknown) =>
	Array.isArray(value)
		? value.filter((item): item is number => typeof item === "number")
		: [];

/** The resources a field's own value links to, by the resource its config declares. */
const linkedTargets = (
	resource: FieldRefResource,
	value: unknown,
): RefTarget[] => {
	if (resource !== "documents") {
		return ids(value).map((id) => ({
			resource,
			table: idTables[resource],
			value: id,
		}));
	}

	return normalizeStoredRelationCustomFieldValues(value, true).flatMap(
		(item) => {
			const table = buildTableName(
				"document",
				{ collection: item.collectionKey },
				null,
			);
			return table.error
				? []
				: [{ resource, table: table.data.name, value: item.id }];
		},
	);
};

/** Extracts media, user, email and document refs from field values using field config and custom extraction for values such as rich text. */
const fieldTargets = (
	owner: CollectionBuilder | BrickBuilder,
	field: FieldInputSchema,
): RefTarget[] => {
	const instance = getFieldBuilderState(owner).fields.get(field.key);
	if (!instance) return [];

	const config = fieldConfigs[instance.type];
	const values = [
		field.value,
		...Object.values(field.translations ?? {}),
	].filter((value) => value !== undefined && value !== null);

	return [
		...values.flatMap((value) => [
			...("resource" in config ? linkedTargets(config.resource, value) : []),
			...instance.getFieldRefTargets(value),
		]),
		...(field.groups ?? []).flatMap((group) =>
			group.fields.flatMap((child) => fieldTargets(owner, child)),
		),
	];
};

/** Collects the media, users, emails and documents stored content links to, field by field. */
const collectContentRefTargets = (
	collection: CollectionBuilder,
	content: { fields: FieldInputSchema[]; bricks: BrickInputSchema[] },
): RefTarget[] => [
	...content.fields.flatMap((field) => fieldTargets(collection, field)),
	...content.bricks.flatMap((brick) => {
		const owner = collection.brickInstances.find(
			(instance) => instance.key === brick.key,
		);
		return owner
			? (brick.fields ?? []).flatMap((field) => fieldTargets(owner, field))
			: [];
	}),
];

export default collectContentRefTargets;
