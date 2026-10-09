import {
	extractEmbeddedBrickRefs,
	type RichTextJSON,
} from "@lucidcms/rich-text";
import {
	generateSourceHTML,
	parseSourceHTML,
} from "@lucidcms/rich-text/server";
import isPlainObject from "../../../../../utils/helpers/is-plain-object.js";
import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import { richTextFieldConfig } from "./config.js";
import RichTextCustomField from "./custom-field.js";
import validateRichTextInputData from "./validate-input.js";

export default {
	config: richTextFieldConfig,
	class: RichTextCustomField,
	validateInput: validateRichTextInputData,
	contentTypeGen: createValueFieldTypeGenerator(
		"Record<string, unknown> | null",
	),
	extractEmbeddedBrickRefs: (value: unknown) =>
		extractEmbeddedBrickRefs(value as RichTextJSON | null),
	//* tools read and write HTML, which models write more reliably than editor JSON
	formatToolValue: (value: unknown) =>
		isPlainObject(value) ? generateSourceHTML(value as RichTextJSON) : value,
	parseToolValue: (value: unknown) =>
		typeof value === "string" ? parseSourceHTML(value) : value,
};
