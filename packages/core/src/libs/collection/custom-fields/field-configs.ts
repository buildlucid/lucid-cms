import { checkboxFieldConfig } from "./fields/checkbox/config.js";
import { codeFieldConfig } from "./fields/code/config.js";
import { collapsibleFieldConfig } from "./fields/collapsible/config.js";
import { colorFieldConfig } from "./fields/color/config.js";
import { datetimeFieldConfig } from "./fields/datetime/config.js";
import { jsonFieldConfig } from "./fields/json/config.js";
import { linkFieldConfig } from "./fields/link/config.js";
import { mediaFieldConfig } from "./fields/media/config.js";
import { numberFieldConfig } from "./fields/number/config.js";
import { rangeFieldConfig } from "./fields/range/config.js";
import { relationFieldConfig } from "./fields/relation/config.js";
import { repeaterFieldConfig } from "./fields/repeater/config.js";
import { richTextFieldConfig } from "./fields/rich-text/config.js";
import { sectionFieldConfig } from "./fields/section/config.js";
import { selectFieldConfig } from "./fields/select/config.js";
import { tabFieldConfig } from "./fields/tab/config.js";
import { textFieldConfig } from "./fields/text/config.js";
import { textareaFieldConfig } from "./fields/textarea/config.js";
import { userFieldConfig } from "./fields/user/config.js";
import type { FieldStaticConfig, FieldTypes } from "./types.js";

/** Static field metadata that is safe for schema and storage infrastructure. */
const fieldConfigs = {
	checkbox: checkboxFieldConfig,
	code: codeFieldConfig,
	collapsible: collapsibleFieldConfig,
	color: colorFieldConfig,
	datetime: datetimeFieldConfig,
	json: jsonFieldConfig,
	link: linkFieldConfig,
	media: mediaFieldConfig,
	number: numberFieldConfig,
	range: rangeFieldConfig,
	relation: relationFieldConfig,
	repeater: repeaterFieldConfig,
	"rich-text": richTextFieldConfig,
	section: sectionFieldConfig,
	select: selectFieldConfig,
	tab: tabFieldConfig,
	text: textFieldConfig,
	textarea: textareaFieldConfig,
	user: userFieldConfig,
} as const satisfies {
	[K in FieldTypes]: FieldStaticConfig<K>;
};

export default fieldConfigs;
