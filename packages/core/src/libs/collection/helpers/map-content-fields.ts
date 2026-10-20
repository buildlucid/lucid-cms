import type { FieldConfig, FieldTypes } from "../../../exports/types.js";
import isPlainObject from "../../../utils/helpers/is-plain-object.js";

/** Maps values through the content field tree, recursing into nested or inline containers and repeaters and mapping each translation when `translated` returns true. */
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
		if (
			config.type === "tab" ||
			config.type === "section" ||
			config.type === "collapsible"
		) {
			if (config.type === "tab" || config.output === "inline") {
				Object.assign(result, mapContentFields(result, config.fields, options));
			} else if (isPlainObject(value)) {
				result[config.key] = mapContentFields(value, config.fields, options);
			}
			continue;
		}
		if (value === undefined) continue;

		if (config.type === "repeater") {
			if (Array.isArray(value)) {
				result[config.key] = value.map((group: unknown) =>
					isPlainObject(group)
						? mapContentFields(group, config.fields, options)
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
