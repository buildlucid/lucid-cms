import z from "zod";

/** Model-facing collection, brick and field guidance returned by `collections_describe`. */
export type AiInstructionsConfig = {
	/**
	 * Content guidance on format, length, tone and relationships, excluded from editor UI.
	 * @remarks Write it for the model in plain English. Help text in `details.description` is sent too, so don't repeat it.
	 */
	instructions: string;
};

export const aiInstructionsSchema = z.strictObject({
	instructions: z.string().trim().min(1),
});
