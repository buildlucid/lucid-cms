import type { TransferEntry, TransferItemResult } from "@types";
import type { TransferUpload } from "@/utils/transfer-archive";

/** One entry from an uploaded file, with its planned and actual outcome. */
export type ImportItem = {
	id: string;
	upload: TransferUpload;
	resource: string;
	/** Entry with remapped copy UIDs, preserved in downloads so retries complete the same import. */
	entry: TransferEntry;
	/** False for entries the file holds in a form the server can't read, which can't be retried or downloaded. */
	valid: boolean;
	planned: TransferItemResult;
	result?: TransferItemResult;
	/**
	 * Original import outcome, preserved across failures so retries complete rather than skip the
	 * entry.
	 */
	createdAs?: "created" | "requested";
	state: "waiting" | "uploading" | "importing" | "done";
	progress: number;
};
