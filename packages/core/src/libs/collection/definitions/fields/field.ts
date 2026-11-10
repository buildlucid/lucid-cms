import type { FieldTypes } from "../../custom-fields/types.js";
import type { FieldNode, FieldNodeOptions } from "./types.js";

type CamelCase<Value extends string> =
	Value extends `${infer Head}-${infer Tail}`
		? `${Head}${Capitalize<CamelCase<Tail>>}`
		: Value;

/**
 * Describes the fields of a collection or brick. Containers take their children in `fields`, so
 * the nesting you write is the nesting editors see. Keys must be unique across the whole
 * collection or brick, including nested fields.
 *
 * @example
 * ```ts
 * const links = [
 * 	field.text("title", { validation: { required: true } }),
 * 	field.repeater("links", {
 * 		validation: { maxGroups: 3 },
 * 		fields: [field.link("link")],
 * 	}),
 * ];
 * ```
 */
const field = {
	/** Groups top-level fields under a tab. Tabs cannot go inside other fields. */
	tab: (key: string, options: FieldNodeOptions<"tab">): FieldNode<"tab"> => ({
		type: "tab",
		key,
		options,
	}),
	/** Adds a repeatable group of the fields inside it. */
	repeater: (
		key: string,
		options: FieldNodeOptions<"repeater">,
	): FieldNode<"repeater"> => ({
		type: "repeater",
		key,
		options,
	}),
	/** Groups the fields inside it under a heading. */
	section: (
		key: string,
		options: FieldNodeOptions<"section">,
	): FieldNode<"section"> => ({
		type: "section",
		key,
		options,
	}),
	/** Groups the fields inside it in a panel editors can collapse. */
	collapsible: (
		key: string,
		options: FieldNodeOptions<"collapsible">,
	): FieldNode<"collapsible"> => ({
		type: "collapsible",
		key,
		options,
	}),
	/** Adds a single-line text input. */
	text: (
		key: string,
		options?: FieldNodeOptions<"text">,
	): FieldNode<"text"> => ({
		type: "text",
		key,
		options,
	}),
	/** Adds a multiline plain-text input. */
	textarea: (
		key: string,
		options?: FieldNodeOptions<"textarea">,
	): FieldNode<"textarea"> => ({
		type: "textarea",
		key,
		options,
	}),
	/** Adds a rich-text editor storing a structured JSON document. */
	richText: (
		key: string,
		options?: FieldNodeOptions<"rich-text">,
	): FieldNode<"rich-text"> => ({
		type: "rich-text",
		key,
		options,
	}),
	/** Adds a numeric input. */
	number: (
		key: string,
		options?: FieldNodeOptions<"number">,
	): FieldNode<"number"> => ({
		type: "number",
		key,
		options,
	}),
	/** Adds a slider with one or two numeric values. */
	range: (
		key: string,
		options?: FieldNodeOptions<"range">,
	): FieldNode<"range"> => ({
		type: "range",
		key,
		options,
	}),
	/** Adds a boolean checkbox. */
	checkbox: (
		key: string,
		options?: FieldNodeOptions<"checkbox">,
	): FieldNode<"checkbox"> => ({
		type: "checkbox",
		key,
		options,
	}),
	/** Adds a dropdown storing the selected option value. */
	select: (
		key: string,
		options?: FieldNodeOptions<"select">,
	): FieldNode<"select"> => ({
		type: "select",
		key,
		options,
	}),
	/** Adds a color picker. */
	color: (
		key: string,
		options?: FieldNodeOptions<"color">,
	): FieldNode<"color"> => ({
		type: "color",
		key,
		options,
	}),
	/** Adds a date input with optional time selection. */
	datetime: (
		key: string,
		options?: FieldNodeOptions<"datetime">,
	): FieldNode<"datetime"> => ({
		type: "datetime",
		key,
		options,
	}),
	/** Adds an editor for a JSON object or array. */
	json: (
		key: string,
		options?: FieldNodeOptions<"json">,
	): FieldNode<"json"> => ({
		type: "json",
		key,
		options,
	}),
	/** Adds a code editor storing its language and source text. */
	code: (
		key: string,
		options?: FieldNodeOptions<"code">,
	): FieldNode<"code"> => ({
		type: "code",
		key,
		options,
	}),
	/** Adds a link with a URL, target and label. */
	link: (
		key: string,
		options?: FieldNodeOptions<"link">,
	): FieldNode<"link"> => ({
		type: "link",
		key,
		options,
	}),
	/** Adds a media picker. Values are media ID arrays, even for single selection. */
	media: (
		key: string,
		options?: FieldNodeOptions<"media">,
	): FieldNode<"media"> => ({
		type: "media",
		key,
		options,
	}),
	/** Adds a document picker restricted to the configured collection keys. */
	relation: (
		key: string,
		options: FieldNodeOptions<"relation">,
	): FieldNode<"relation"> => ({
		type: "relation",
		key,
		options,
	}),
	/** Adds a user picker. Values are user ID arrays, even for single selection. */
	user: (
		key: string,
		options?: FieldNodeOptions<"user">,
	): FieldNode<"user"> => ({
		type: "user",
		key,
		options,
	}),
	/** Adds a picker for sent emails, external by default, storing email ID arrays even for single selection. */
	email: (
		key: string,
		options?: FieldNodeOptions<"email">,
	): FieldNode<"email"> => ({
		type: "email",
		key,
		options,
	}),
} satisfies {
	//* keyed by field type, so a type missing here fails the type check
	[Type in FieldTypes as CamelCase<Type>]: (
		key: string,
		options: FieldNodeOptions<Type>,
	) => FieldNode<Type>;
};

export default field;
