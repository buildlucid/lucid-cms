import z from "zod";

const RuntimeAdapterSchema = z.object({
	key: z.string(),
	config: z
		.object({
			customBuildArtifacts: z.array(z.string()).optional(),
		})
		.optional(),
	lucid: z.string(),
});

export default RuntimeAdapterSchema;
