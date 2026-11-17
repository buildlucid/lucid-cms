import { copy } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import choiceSchema from "./choice-schema.js";
import optionsSetting from "./options-setting.js";

/** One choice from a list of radio buttons. */
export default defineFormFieldType({
	key: "radio",
	label: copy("admin:plugin.forms.field.radio.label"),
	control: "radio",
	settings: [optionsSetting()],
	without: ["placeholder", "defaultValue"],
	schema: choiceSchema,
});
