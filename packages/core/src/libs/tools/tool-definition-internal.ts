import type { z } from "zod";
import { normalizeCopy } from "../i18n/index.js";
import type { AdminCopyInput } from "../i18n/types.js";

export const toolDefinitionInternal = Symbol(
	"@lucidcms/core/tool-definition-internal",
);

export const toolDefinitionBase = <const Name extends string>(options: {
	name: Name;
	title?: AdminCopyInput;
	description: string;
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
