import type { InternalDocumentField } from "@types";
import type {
	CollectionFieldConfig,
	CollectionFieldConfigByType,
} from "@/types/collection-config";
import resolveFieldAccess, {
	type FieldAccess,
} from "@/utils/resolve-field-access";

type RepeaterConfig = CollectionFieldConfigByType<"repeater">;
type Group = NonNullable<InternalDocumentField["groups"]>[number];

/** A repeater in the builder's fields, addressed the way the brick store's group actions expect. */
export type RepeaterScope = {
	repeaterKey: string;
	/** For nested repeaters, the group holding it and that group's repeater. */
	parentRef?: string;
	parentRepeaterKey?: string;
	config: RepeaterConfig;
	/** Its groups in content order, which content paths index. */
	groups: Group[];
	/** Whether the user can add, move and remove its groups. */
	editable: boolean;
};

type Match =
	| { kind: "container"; fields: CollectionFieldConfig[]; access: FieldAccess }
	| { kind: "repeater"; config: RepeaterConfig; access: FieldAccess };

/**
 * Finds `key` among configs: a nested section or collapsible, which content paths name, or a
 * repeater. Tabs and inline containers are passed through, their permissions applied on the way.
 */
const find = (
	configs: CollectionFieldConfig[],
	key: string,
	access: FieldAccess,
): Match | null => {
	for (const config of configs) {
		const own = resolveFieldAccess(config.permissions, access);
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			if (config.type !== "tab" && config.output === "nested") {
				if (config.key === key) {
					return { kind: "container", fields: config.fields, access: own };
				}
				continue;
			}
			const nested = find(config.fields, key, own);
			if (nested) return nested;
			continue;
		}
		if (config.key === key) {
			return config.type === "repeater"
				? { kind: "repeater", config, access: own }
				: null;
		}
	}
	return null;
};

/**
 * Resolves a content path to the repeater it targets, either the repeater itself or one of its
 * items (`index`). Null when the path doesn't lead to a repeater.
 */
export const resolveRepeater = (props: {
	configs: CollectionFieldConfig[];
	fields: InternalDocumentField[];
	path: Array<string | number>;
	access: FieldAccess;
}): { scope: RepeaterScope; index?: number } | null => {
	let configs = props.configs;
	let fields = props.fields;
	let access = props.access;
	let parentRef: string | undefined;
	let parentRepeaterKey: string | undefined;

	for (let offset = 0; offset < props.path.length;) {
		const key = props.path[offset];
		if (typeof key !== "string") return null;
		const match = find(configs, key, access);
		if (!match) return null;
		if (match.kind === "container") {
			configs = match.fields;
			access = match.access;
			offset += 1;
			continue;
		}

		const groups = [
			...(fields.find((field) => field.key === key)?.groups ?? []),
		].sort((a, b) => a.order - b.order);
		const scope: RepeaterScope = {
			repeaterKey: key,
			parentRef,
			parentRepeaterKey,
			config: match.config,
			groups,
			editable:
				match.access === "editable" && match.config.ui?.disabled !== true,
		};
		const index = props.path[offset + 1];
		if (index === undefined) return { scope };
		if (typeof index !== "number") return null;
		if (offset + 2 === props.path.length) return { scope, index };

		const group = groups[index];
		if (!group) return null;
		parentRef = group.ref;
		parentRepeaterKey = key;
		configs = match.config.fields;
		fields = group.fields;
		access = match.access;
		offset += 2;
	}
	return null;
};
