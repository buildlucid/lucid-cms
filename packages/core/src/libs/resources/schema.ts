import z from "zod";
import { resourceKinds } from "./types.js";

const source = z.union([z.string().min(1), z.instanceof(URL)]);

export const ResourceDiscoverySchema = z
	.partialRecord(
		z.enum(resourceKinds),
		z.union([z.string().min(1), z.literal(false)]),
	)
	.default({});

export const ResourceSourcesSchema = z
	.object({
		collections: z.array(source).optional(),
		tables: z.array(source).optional(),
		routes: z.array(source).optional(),
		hooks: z.array(source).optional(),
		jobs: z.array(source).optional(),
		migrations: z.array(source).optional(),
		seeds: z.array(source).optional(),
		translations: z.array(source).optional(),
		templates: z.array(source).optional(),
		public: z
			.array(
				z.union([
					source,
					z.object({ input: source, output: z.string().min(1) }),
				]),
			)
			.optional(),
	})
	.default({});
