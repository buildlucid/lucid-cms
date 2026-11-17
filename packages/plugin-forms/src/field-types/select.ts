import { copy } from "@lucidcms/core";
import defineFormFieldType from "../define-form-field-type.js";
import choiceSchema from "./choice-schema.js";
import optionsSetting from "./options-setting.js";

/** One choice from a dropdown. */
export default defineFormFieldType({
	key: "select",
	label: copy("admin:plugin.forms.field.select.label"),
	control: "select",
	settings: [optionsSetting()],
	without: ["defaultValue"],
	schema: choiceSchema,
});
