import type { z } from "zod";
import { normalizeCopy } from "../i18n/index.js";
import type { AdminCopyInput } from "../i18n/types.js";

/** Registered symbol recognizing tool definitions across core copies, including copies evaluated by config loaders. */
export const toolDefinitionInternal = Symbol.for(
	"@lucidcms/core/tool-definition-internal",
);

export const toolDefinitionBase = <
	const Name extends string,
	Description,
>(options: {
	name: Name;
	title?: AdminCopyInput;
	description: Description;
	input: z.ZodObject;
	output: z.ZodObject;
}) => ({
	type: "tool-definition" as const,
	name: options.name,
	title: normalizeCopy(options.title),
	description: options.description,
	input: options.input,
	output: options.output,
});
