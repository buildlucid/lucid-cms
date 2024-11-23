import z from "zod";

const BrickConfigSchema = z.object({
	details: z.object({
		name: z.union([z.string(), z.record(z.string(), z.string())]),
		summary: z.union([z.string(), z.record(z.string(), z.string())]).optional(),
	}),
	preview: z
		.object({
			image: z.string().optional(),
		})
		.optional(),
});

export default BrickConfigSchema;
