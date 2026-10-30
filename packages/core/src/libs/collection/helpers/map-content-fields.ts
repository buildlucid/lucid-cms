import type { FieldConfig, FieldTypes } from "../../../exports/types.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";
import { fieldHooks } from "../custom-fields/registered-fields.js";
import { storageModes } from "../custom-fields/storage/index.js";

/** Maps values through the content field tree, recursing into the children containers place inline or nested and into grouped fields such as repeaters, and mapping each translation when `translated` returns true. */
const mapContentFields = (
	fields: Record<string, unknown>,
	tree: FieldConfig<FieldTypes>[],
	options: {
		map: (value: unknown, config: FieldConfig<FieldTypes>) => unknown;
		translated: (config: FieldConfig<FieldTypes>) => boolean;
	},
): Record<string, unknown> => {
	const result = { ...fields };
	for (const config of tree) {
		const value = result[config.key];
		const children = fieldHooks[config.type].contentChildren?.(config);
		if (children) {
			if (children.output === "inline") {
				Object.assign(
					result,
					mapContentFields(result, children.fields, options),
				);
			} else if (isPlainObject(value)) {
				result[config.key] = mapContentFields(value, children.fields, options);
			}
			continue;
		}
		if (value === undefined) continue;

		const storage = storageModes[fieldHooks[config.type].config.database.mode];
		if (storage.mode === "tree-table") {
			if (Array.isArray(value)) {
				const groupFields = storage.getChildFieldConfigs(config) ?? [];
				result[config.key] = value.map((group: unknown) =>
					isPlainObject(group)
						? mapContentFields(group, groupFields, options)
						: group,
				);
			}
			continue;
		}

		result[config.key] =
			options.translated(config) && isPlainObject(value)
				? Object.fromEntries(
						Object.entries(value).map(([locale, translation]) => [
							locale,
							options.map(translation, config),
						]),
					)
				: options.map(value, config);
	}
	return result;
};

export default mapContentFields;
