import type z from "zod";
import { isTranslatableText } from "./text.js";
import type { LiteralText, ServerTextDescriptor } from "./types.js";

const LUCID_ZOD_TEXT_PARAM = "lucidText";

type ZodIssueText = ServerTextDescriptor | LiteralText;

type ZodIssueWithParams = z.core.$ZodIssue & {
	params?: Record<string, unknown>;
};

const getFallbackMessage = (value: ZodIssueText) => {
	if (value.type === "lucid.literal") return value.value;
	return value.defaultMessage ?? value.key;
};

export const zodTextIssue = (value: ZodIssueText) => ({
	message: getFallbackMessage(value),
	params: {
		[LUCID_ZOD_TEXT_PARAM]: value,
	},
});

export const getZodIssueText = (
	issue: z.core.$ZodIssue,
): ZodIssueText | undefined => {
	const value = (issue as ZodIssueWithParams).params?.[LUCID_ZOD_TEXT_PARAM];
	if (!isTranslatableText(value)) return undefined;
	if (value.type === "lucid.text") {
		if (value.scope !== "server") return undefined;
		return value as ServerTextDescriptor;
	}
	return value;
};
