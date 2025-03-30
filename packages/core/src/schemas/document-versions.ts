import z from "zod";

export const versionTypesSchema = z.union([
	z.literal("draft"),
	z.literal("revision"),
	z.literal("published"),
]);
