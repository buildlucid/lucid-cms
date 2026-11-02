import z from "zod";

export const transferRefsSchema = z.record(
	z.string(),
	z.record(z.string(), z.string().min(1)),
);

/** Properties every entry has. Definitions extend this for their own entries. */
export const transferEntrySchema = z.object({
	uid: z.string().min(1).max(128),
	refs: transferRefsSchema.optional(),
	file: z.string().min(1).optional(),
});

/** The parts of an export file read before each resource checks its own entries. */
export const transferFileSchema = z.object({
	lucid: z.object({ format: z.literal(1), version: z.string() }),
	source: z.object({ instanceId: z.string(), url: z.string() }),
	exportedAt: z.string(),
	locales: z.array(z.string()),
	resources: z.record(z.string(), z.array(z.unknown())),
});
