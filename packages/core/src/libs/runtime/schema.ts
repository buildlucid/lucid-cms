import * as z from "zod";

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
	/** Module exporting the runtime without CLI tooling, such as `@lucidcms/runtime-node/runtime`, which replaces the package's main entry in built output. */
	runtimeEntrypoint: z.string().optional(),
	lucid: z.string(),
});

export default RuntimeAdapterSchema;
