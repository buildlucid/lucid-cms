import type {
	ServiceContext,
	ServiceResponse,
} from "../../../../utils/services/types.js";
import type { TransferExportFile } from "../../../transfer/types.js";
import { runToolkitService } from "../../utils.js";
import { inputSchema } from "./schema.js";
import type { ToolkitTransferExportInput } from "./types.js";

export type * from "./types.js";

/** Builds an export file from records on this site, with the media they link to. */
const exportFile = (
	context: ServiceContext,
	input: ToolkitTransferExportInput,
): ServiceResponse<TransferExportFile> =>
	runToolkitService({
		schema: inputSchema,
		input,
		handler: async (data) => {
			const { default: exportTransfer } =
				await import("../../../../services/transfer/export-file.js");

			return exportTransfer(context, {
				actor: data.actor,
				select: data.select,
				linked: data.linked ?? false,
			});
		},
		name: {
			key: "core.toolkit.transfer.export.error.name",
		},
		message: {
			key: "core.toolkit.transfer.export.error.message",
		},
	});

export default exportFile;
