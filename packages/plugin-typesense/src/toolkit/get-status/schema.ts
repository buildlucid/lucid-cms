import { z } from "@lucidcms/core";

export const inputSchema = z.object({ index: z.string().min(1) });
export type TypesenseGetStatusInput = z.input<typeof inputSchema>;
