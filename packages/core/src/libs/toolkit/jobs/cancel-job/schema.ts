import z from "zod";

export const inputSchema = z.object({ id: z.string().min(1) });
