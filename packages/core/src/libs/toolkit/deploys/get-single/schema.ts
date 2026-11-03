import z from "zod";

export const inputSchema = z.object({ key: z.string().trim().min(1) });
