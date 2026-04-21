import checkbox from "./fields/checkbox/index.js";
import color from "./fields/color/index.js";
import datetime from "./fields/datetime/index.js";
import document from "./fields/document/index.js";
import json from "./fields/json/index.js";
import link from "./fields/link/index.js";
import media from "./fields/media/index.js";
import number from "./fields/number/index.js";
import repeater from "./fields/repeater/index.js";
import richText from "./fields/rich-text/index.js";
import select from "./fields/select/index.js";
import tab from "./fields/tab/index.js";
import text from "./fields/text/index.js";
import textarea from "./fields/textarea/index.js";
import user from "./fields/user/index.js";
import type { FieldTypes, RegisteredFieldDefinition } from "./types.js";
import { fieldTypes } from "./types.js";

const registeredFields = {
	checkbox: checkbox,
	color: color,
	datetime: datetime,
	document: document,
	json: json,
	link: link,
	media: media,
	number: number,
	repeater: repeater,
	select: select,
	tab: tab,
	text: text,
	textarea: textarea,
	user: user,
	"rich-text": richText,
} as const satisfies {
	[K in FieldTypes]: RegisteredFieldDefinition<K>;
};

export const registeredFieldTypes: readonly FieldTypes[] = fieldTypes;

export default registeredFields;
