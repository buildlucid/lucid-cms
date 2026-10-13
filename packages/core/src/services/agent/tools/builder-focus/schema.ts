import z from "zod";

export const outputSchema = z.object({ shown: z.boolean() });
