import z from "zod";

const RuntimeAdapterSchema = z.object({
	key: z.string(),
	hosts: z
		.record(
			z.string(),
			z.object({
				entrypoint: z.string(),
				integrationEntrypoint: z.string().optional(),
			}),
		)
		.optional(),
	config: z
		.object({
			customBuildArtifacts: z.array(z.string()).optional(),
			customPrepareArtifacts: z.array(z.string()).optional(),
		})
		.optional(),
	lucid: z.string(),
});

export default RuntimeAdapterSchema;
