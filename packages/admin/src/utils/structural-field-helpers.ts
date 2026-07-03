import type {
	CollectionDataFieldConfig,
	CollectionFieldConfig,
} from "@/types/collection-config";

/**
 * Structural containers (tabs, sections, collapsibles) are transparent for
 * field data - their fields belong to the containing level, both in config
 * and in the submitted field data.
 */
export const flattenStructuralScopeConfigs = (
	configs: CollectionFieldConfig[],
): CollectionDataFieldConfig[] => {
	return configs.flatMap((config) =>
		config.type === "tab" ||
		config.type === "section" ||
		config.type === "collapsible"
			? flattenStructuralScopeConfigs(config.fields)
			: [config],
	);
};
