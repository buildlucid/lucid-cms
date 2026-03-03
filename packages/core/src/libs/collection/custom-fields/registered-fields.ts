import CheckboxCustomField from "./fields/checkbox/checkbox.js";
import ColorCustomField from "./fields/color/color.js";
import DatetimeCustomField from "./fields/datetime/datetime.js";
import DocumentCustomField from "./fields/document/document.js";
import JsonCustomField from "./fields/json/json.js";
import LinkCustomField from "./fields/link/link.js";
import MediaCustomField from "./fields/media/media.js";
import NumberCustomField from "./fields/number/number.js";
import RepeaterCustomField from "./fields/repeater/repeater.js";
import RichTextCustomField from "./fields/rich-text/rich-text.js";
import SelectCustomField from "./fields/select/select.js";
import TabCustomField from "./fields/tab/tab.js";
import TextCustomField from "./fields/text/text.js";
import TextareaCustomField from "./fields/textarea/textarea.js";
import UserCustomField from "./fields/user/user.js";
import type { FieldTypes } from "./types.js";

const registeredFields = {
	checkbox: {
		class: CheckboxCustomField,
	},
	color: {
		class: ColorCustomField,
	},
	datetime: {
		class: DatetimeCustomField,
	},
	document: {
		class: DocumentCustomField,
	},
	json: {
		class: JsonCustomField,
	},
	link: {
		class: LinkCustomField,
	},
	media: {
		class: MediaCustomField,
	},
	number: {
		class: NumberCustomField,
	},
	repeater: {
		class: RepeaterCustomField,
	},
	select: {
		class: SelectCustomField,
	},
	tab: {
		class: TabCustomField,
	},
	text: {
		class: TextCustomField,
	},
	textarea: {
		class: TextareaCustomField,
	},
	user: {
		class: UserCustomField,
	},
	"rich-text": {
		class: RichTextCustomField,
	},
} satisfies Record<
	FieldTypes,
	{
		class: unknown;
	}
>;

export default registeredFields;
