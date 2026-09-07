import z from "zod";

export const inputSchema = z.object({ token: z.string().min(1) });
