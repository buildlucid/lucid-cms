import type { CollectionFieldConfig } from "@/types/collection-config";
import resolveFieldAccess, {
	type FieldAccess,
} from "@/utils/resolve-field-access";

/** Removes the field configs the current user can't see, including inside tabs, sections, collapsibles and repeaters. */
const filterReadableFieldConfigs = <T extends CollectionFieldConfig>(
	configs: T[],
	parent: FieldAccess = "editable",
): T[] =>
	configs.flatMap((config) => {
		const access = resolveFieldAccess(config.permissions, parent);
		if (access === "hidden") return [];
		if (!("fields" in config)) return [config];

		return [
			{
				...config,
				fields: filterReadableFieldConfigs(config.fields, access),
			},
		];
	});

export default filterReadableFieldConfigs;
