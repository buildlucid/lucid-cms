import {
	extractEmbeddedBrickRefs,
	mapRichTextReferences,
	type RichTextJSON,
	removeRichTextEmbeddedBricks,
} from "@lucidcms/rich-text";
import {
	generateSourceHTML,
	generateText,
	parseSourceHTML,
} from "@lucidcms/rich-text/server";
import isPlainObject from "../../../../../utils/helpers/is-plain-object.js";
import { createValueFieldTypeGenerator } from "../../../type-gen/custom-field.js";
import type { FieldRefMapper, FieldTranslation } from "../../types.js";
import { richTextFieldConfig } from "./config.js";
import RichTextCustomField from "./custom-field.js";
import restrictRichTextValidationData from "./restrict-validation-data.js";
import validateRichTextInputData from "./validate-input.js";

export default {
	config: richTextFieldConfig,
	class: RichTextCustomField,
	validateInput: validateRichTextInputData,
	restrictValidationData: restrictRichTextValidationData,
	contentTypeGen: createValueFieldTypeGenerator("RichTextFieldValue | null"),
	extractEmbeddedBrickRefs: (value: unknown) =>
		extractEmbeddedBrickRefs(value as RichTextJSON | null),
	//* tools read and write HTML, which models write more reliably than editor JSON
	formatToolValue: (value: unknown) =>
		isPlainObject(value) ? generateSourceHTML(value as RichTextJSON) : value,
	parseToolValue: (value: unknown) =>
		typeof value === "string" ? parseSourceHTML(value) : value,
	mapRefs: (value: unknown, map: FieldRefMapper) =>
		isPlainObject(value)
			? mapRichTextReferences(value as RichTextJSON, map)
			: value,
	removeEmbeddedBrickRefs: (value: unknown, refs: ReadonlySet<string>) =>
		isPlainObject(value)
			? removeRichTextEmbeddedBricks(value as RichTextJSON, refs)
			: value,
	//* translated as source HTML so marks, links and embedded content keep their attributes
	translation: {
		read: (value) =>
			isPlainObject(value) && generateText(value as RichTextJSON).trim() !== ""
				? { format: "html", text: generateSourceHTML(value as RichTextJSON) }
				: null,
		write: (text) => parseSourceHTML(text),
	} satisfies FieldTranslation,
};
