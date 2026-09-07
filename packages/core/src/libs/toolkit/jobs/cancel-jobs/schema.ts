import z from "zod";

export const inputSchema = z.object({ ids: z.array(z.string().min(1)) });
