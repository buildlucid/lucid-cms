import type { FormFieldTypeDefinition } from "../types.js";
import checkbox from "./checkbox.js";
import checkboxes from "./checkboxes.js";
import date from "./date.js";
import email from "./email.js";
import hidden from "./hidden.js";
import number from "./number.js";
import phone from "./phone.js";
import radio from "./radio.js";
import select from "./select.js";
import text from "./text.js";
import textarea from "./textarea.js";
import upload from "./upload.js";
import url from "./url.js";

/** The field types every form can use, in the order the builder lists them. */
const builtInFieldTypes: FormFieldTypeDefinition[] = [
	text,
	textarea,
	email,
	phone,
	url,
	number,
	select,
	radio,
	checkboxes,
	checkbox,
	date,
	upload,
	hidden,
];

export default builtInFieldTypes;
