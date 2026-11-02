import type z from "zod";
import type { TransferSelections } from "../../../transfer/types.js";
import type { inputSchema } from "./schema.js";

export type ToolkitTransferExportInput = Omit<
	z.input<typeof inputSchema>,
	"select"
> & {
	/** What to export by resource, eg. `{ documents: [{ collectionKey: "pages", ids: [1] }] }`. */
	select: Partial<TransferSelections>;
};
