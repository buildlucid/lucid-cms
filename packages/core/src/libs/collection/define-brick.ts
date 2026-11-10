import BrickDefinition from "./definitions/brick/index.js";
import type { BrickOptions } from "./definitions/brick/types.js";
import type { FieldNode } from "./definitions/fields/types.js";

export type DefineBrickOptions = BrickOptions & {
	/** Unique brick key, used in stored content and generated types. */
	key: string;
	/** The brick's fields, built with `field`. Tabs go at the top level. */
	fields?: readonly FieldNode[];
};

/**
 * Defines a reusable group of fields for fixed, builder or embedded content. Add it to a
 * collection's `bricks`.
 *
 * @example
 * ```ts
 * const banner = defineBrick({
 * 	key: "banner",
 * 	fields: [
 * 		field.text("title", { validation: { required: true } }),
 * 		field.repeater("call_to_actions", {
 * 			validation: { maxGroups: 3 },
 * 			fields: [field.link("link")],
 * 		}),
 * 	],
 * });
 * ```
 */
const defineBrick = ({ key, fields, ...options }: DefineBrickOptions) =>
	new BrickDefinition(key, options).insertFields(fields ?? []);

export default defineBrick;
