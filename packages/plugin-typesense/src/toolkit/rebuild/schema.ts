import { z } from "@lucidcms/core";

export const inputSchema = z.object({ index: z.string().min(1) });
export type TypesenseRebuildInput = z.input<typeof inputSchema>;
