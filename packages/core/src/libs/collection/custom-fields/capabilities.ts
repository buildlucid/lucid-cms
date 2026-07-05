/** Shared field-type filter/sort capabilities for core and admin. */

import { checkboxFieldConfig } from "./fields/checkbox/config.js";
import { codeFieldConfig } from "./fields/code/config.js";
import { collapsibleFieldConfig } from "./fields/collapsible/config.js";
import { colorFieldConfig } from "./fields/color/config.js";
import { datetimeFieldConfig } from "./fields/datetime/config.js";
import { jsonFieldConfig } from "./fields/json/config.js";
import { linkFieldConfig } from "./fields/link/config.js";
import { mediaFieldConfig } from "./fields/media/config.js";
import { numberFieldConfig } from "./fields/number/config.js";
import { relationFieldConfig } from "./fields/relation/config.js";
import { repeaterFieldConfig } from "./fields/repeater/config.js";
import { richTextFieldConfig } from "./fields/rich-text/config.js";
import { sectionFieldConfig } from "./fields/section/config.js";
import { selectFieldConfig } from "./fields/select/config.js";
import { tabFieldConfig } from "./fields/tab/config.js";
import { textFieldConfig } from "./fields/text/config.js";
import { textareaFieldConfig } from "./fields/textarea/config.js";
import { userFieldConfig } from "./fields/user/config.js";

export type FieldTypeCapabilities = {
	filterable: boolean;
	sortable: boolean;
};

export const fieldTypeCapabilities = {
	[checkboxFieldConfig.type]: checkboxFieldConfig.capabilities,
	[codeFieldConfig.type]: codeFieldConfig.capabilities,
	[collapsibleFieldConfig.type]: collapsibleFieldConfig.capabilities,
	[colorFieldConfig.type]: colorFieldConfig.capabilities,
	[datetimeFieldConfig.type]: datetimeFieldConfig.capabilities,
	[jsonFieldConfig.type]: jsonFieldConfig.capabilities,
	[linkFieldConfig.type]: linkFieldConfig.capabilities,
	[mediaFieldConfig.type]: mediaFieldConfig.capabilities,
	[numberFieldConfig.type]: numberFieldConfig.capabilities,
	[relationFieldConfig.type]: relationFieldConfig.capabilities,
	[repeaterFieldConfig.type]: repeaterFieldConfig.capabilities,
	[richTextFieldConfig.type]: richTextFieldConfig.capabilities,
	[sectionFieldConfig.type]: sectionFieldConfig.capabilities,
	[selectFieldConfig.type]: selectFieldConfig.capabilities,
	[tabFieldConfig.type]: tabFieldConfig.capabilities,
	[textFieldConfig.type]: textFieldConfig.capabilities,
	[textareaFieldConfig.type]: textareaFieldConfig.capabilities,
	[userFieldConfig.type]: userFieldConfig.capabilities,
} as const satisfies Record<string, FieldTypeCapabilities>;

export type CapabilityFieldType = keyof typeof fieldTypeCapabilities;

/** Resolves the capability matrix entry for a field type. Unknown types support nothing. */
export const getFieldTypeCapabilities = (
	type: string,
): FieldTypeCapabilities => {
	return (
		fieldTypeCapabilities[type as CapabilityFieldType] ?? {
			filterable: false,
			sortable: false,
		}
	);
};

/** Whether documents can be filtered by this field type's stored value. */
export const isFieldTypeFilterable = (type: string): boolean => {
	return getFieldTypeCapabilities(type).filterable;
};

/** Whether documents can be sorted by this field type's stored value. */
export const isFieldTypeSortable = (type: string): boolean => {
	return getFieldTypeCapabilities(type).sortable;
};
