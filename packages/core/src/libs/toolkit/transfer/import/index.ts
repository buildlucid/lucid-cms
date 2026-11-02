import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type {
	ToolkitTransferImportInput,
	ToolkitTransferImportResult,
} from "./types.js";

export type * from "./types.js";

/**
 * Imports an export file, entry by entry. Entries that succeed are kept when others fail,
 * so check `items` for each outcome.
 * @remarks Media uploads can't run in a transaction, so import files with media outside one.
 */
const importFile = (
	context: ServiceContext,
	input: ToolkitTransferImportInput,
): ServiceResponse<ToolkitTransferImportResult> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: importTransfer } =
				await import("../../../../services/transfer/import-file.js");

			return importTransfer(context, {
				actor: data.actor,
				file: data.file,
				mode: data.mode ?? "upsert",
				files: data.files,
				dryRun: data.dryRun,
			});
		},
		name: {
			key: "core.toolkit.transfer.import.error.name",
		},
		message: {
			key: "core.toolkit.transfer.import.error.message",
		},
	});

export default importFile;
