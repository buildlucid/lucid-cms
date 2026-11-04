import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";
import resolveFieldAccess, {
	type FieldAccess,
} from "@/utils/resolve-field-access";

/** What a preview content path names: a nested section or collapsible, or a data field. */
export type PreviewConfigMatch =
	| { kind: "container"; fields: CollectionFieldConfig[]; access: FieldAccess }
	| { kind: "field"; config: CollectionDataFieldConfig; access: FieldAccess };

/**
 * Finds a field by preview path, traversing tabs and inline containers while accumulating access
 * permissions.
 */
export const findPreviewConfig = (
	configs: CollectionFieldConfig[],
	key: string,
	access: FieldAccess,
): PreviewConfigMatch | null => {
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
			const nested = findPreviewConfig(config.fields, key, own);
			if (nested) return nested;
			continue;
		}
		if (config.key === key) return { kind: "field", config, access: own };
	}
	return null;
};
