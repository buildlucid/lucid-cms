import type { RichTextJSON } from "@lucidcms/rich-text";
import { generateText } from "@lucidcms/rich-text/server";
import z from "zod";

export const richTextJSONSchema = z
	.looseObject({
		type: z.literal("doc"),
		content: z.array(z.record(z.string(), z.unknown())).optional(),
	})
	.refine(
		(value) => {
			try {
				generateText(value as RichTextJSON);
				return true;
			} catch {
				return false;
			}
		},
		{
			message: "Invalid rich text content.",
		},
	);
