import type CollectionBuilder from "../../collection/builders/collection-builder/index.js";
import type FieldBuilder from "../../collection/builders/field-builder/index.js";
import { getFieldBuilderState } from "../../collection/builders/field-builder/index.js";
import getFieldAccess from "../../collection/field-access/get-field-access.js";
import logger from "../../logger/index.js";

/** Resolves access for someone with no permissions, which shows every restriction. */
const unprivileged = { superAdmin: false, permissions: [] };

const checkFields = (
	label: string,
	builder: FieldBuilder,
	owner: { collection: string; brick?: string },
) => {
	const access = getFieldAccess(builder, unprivileged, owner);
	for (const [key, field] of getFieldBuilderState(builder).fields) {
		const validation =
			"validation" in field.config ? field.config.validation : undefined;
		if (
			validation &&
			"required" in validation &&
			validation.required === true &&
			access.get(key) !== "editable"
		) {
			logger.warn({
				message: `Field "${key}" in ${label} is required and restricted. New documents from users who can't change it keep its default, so make sure the default passes validation.`,
			});
		}
	}
};

/**
 * Checks field, tab, section, collapsible and brick permissions: embedded bricks can't be hidden
 * from readers, label and route fields must be readable by everyone, and restricted required fields warn.
 */
const checkFieldPermissions = (collection: CollectionBuilder) => {
	const label = `collection "${collection.key}"`;
	checkFields(label, collection, { collection: collection.key });

	const access = getFieldAccess(collection, unprivileged, {
		collection: collection.key,
	});
	const routingField = collection.getData.routing?.field;
	for (const key of [
		...collection.getData.labelFields,
		...(routingField ? [routingField] : []),
	]) {
		if (access.get(key) === "hidden") {
			throw new Error(
				`Field "${key}" in ${label} labels or routes documents, so it and its tab, section or collapsible can't have a read permission.`,
			);
		}
	}

	for (const brick of collection.brickInstances) {
		checkFields(`brick "${brick.key}"`, brick, {
			collection: collection.key,
			brick: brick.key,
		});
	}

	for (const brick of collection.config.bricks?.embedded ?? []) {
		if (brick.config.permissions?.read === true) {
			throw new Error(
				`Brick "${brick.key}" is embedded in ${label}, so it can only have an update permission. Hiding it would change the rich text it sits in.`,
			);
		}
	}
};

export default checkFieldPermissions;
