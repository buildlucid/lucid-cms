import type { TransferItemResult } from "@lucidcms/types";
import type z from "zod";
import type { inputSchema } from "./schema.js";

export type ToolkitTransferImportInput = z.input<typeof inputSchema>;

export type ToolkitTransferImportResult = {
	/** Each entry's outcome, in the order they were imported. */
	items: TransferItemResult[];
};
