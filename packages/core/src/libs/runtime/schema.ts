import * as z from "zod";

const RuntimeAdapterSchema = z.object({
	key: z.string(),
	config: z
		.object({
			customBuildArtifacts: z.array(z.string()).optional(),
			customPrepareArtifacts: z.array(z.string()).optional(),
		})
		.optional(),
	/** Module whose default export is the runtime's `RuntimeViteIntegration`, loaded by `@lucidcms/core/vite`. */
	vite: z.string().optional(),
	lucid: z.string(),
});

/** The shape of `defineConfig({ host })`. */
export const HostAdapterSchema = z.object({ key: z.string(), cli: z.string() });

export default RuntimeAdapterSchema;
