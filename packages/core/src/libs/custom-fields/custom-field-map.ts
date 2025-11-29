import CheckboxCustomField from "./fields/checkbox.js";
import ColorCustomField from "./fields/color.js";
import DatetimeCustomField from "./fields/datetime.js";
import DocumentCustomField from "./fields/document.js";
import JsonCustomField from "./fields/json.js";
import LinkCustomField from "./fields/link.js";
import MediaCustomField from "./fields/media.js";
import NumberCustomField from "./fields/number.js";
import RepeaterCustomField from "./fields/repeater.js";
import SelectCustomField from "./fields/select.js";
import TabCustomField from "./fields/tab.js";
import TextCustomField from "./fields/text.js";
import TextareaCustomField from "./fields/textarea.js";
import UserCustomField from "./fields/user.js";
import WysiwygCustomField from "./fields/wysiwyg.js";
import type { FieldTypes } from "./types.js";

const customFieldMap = {
	checkbox: CheckboxCustomField,
	color: ColorCustomField,
	datetime: DatetimeCustomField,
	document: DocumentCustomField,
	json: JsonCustomField,
	link: LinkCustomField,
	media: MediaCustomField,
	number: NumberCustomField,
	repeater: RepeaterCustomField,
	select: SelectCustomField,
	tab: TabCustomField,
	text: TextCustomField,
	textarea: TextareaCustomField,
	user: UserCustomField,
	wysiwyg: WysiwygCustomField,
	// biome-ignore lint/suspicious/noExplicitAny: <explanation>
} satisfies Record<FieldTypes, any>; // used to verify the field types are correct

export default customFieldMap;
