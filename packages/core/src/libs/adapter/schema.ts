import z from "zod";

const LucidAdapterSchema = z.object({
	key: z.string(),
	lucid: z.string(),
});

export default LucidAdapterSchema;
