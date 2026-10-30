import { resolveFieldPermissions } from "../../permission/field-permissions.js";
import type FieldBuilder from "../builders/field-builder/index.js";
import { getFieldBuilderState } from "../builders/field-builder/index.js";
import resolveFieldAccess, { narrowestAccess } from "./resolve-field-access.js";
import type { FieldAccess, FieldAccessActor } from "./types.js";

/** Resolves each field's narrowest access from generated permissions, tabs, sections, collapsibles, repeaters and `base`, using `owner` to scope the collection and brick. */
const getFieldAccess = (
	builder: FieldBuilder,
	actor: FieldAccessActor | undefined,
	owner: { collection: string; brick?: string },
	base: FieldAccess = "editable",
): Map<string, FieldAccess> => {
	const fields = getFieldBuilderState(builder).fields;
	const access = new Map<string, FieldAccess>();

	const resolve = (key: string): FieldAccess => {
		const resolved = access.get(key);
		if (resolved) return resolved;

		const field = fields.get(key);
		if (!field) return base;

		let result = narrowestAccess(
			base,
			resolveFieldAccess(
				actor,
				resolveFieldPermissions(
					{ ...owner, field: key },
					field.config.permissions,
				),
			),
		);
		for (const parent of [
			field.tabParent,
			field.structuralParent,
			field.treeParent,
		]) {
			if (parent !== null) result = narrowestAccess(result, resolve(parent));
		}

		access.set(key, result);
		return result;
	};

	for (const key of fields.keys()) resolve(key);
	return access;
};

export default getFieldAccess;
