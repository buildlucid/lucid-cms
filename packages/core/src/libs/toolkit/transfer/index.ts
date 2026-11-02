import type {
	ServiceContext,
	ServiceResponse,
} from "../../../utils/services/types.js";
import type { TransferExportFile } from "../../transfer/types.js";
import exportFile, { type ToolkitTransferExportInput } from "./export/index.js";
import importFile, {
	type ToolkitTransferImportInput,
	type ToolkitTransferImportResult,
} from "./import/index.js";

/** Exports records to portable files and imports them, on this site or another. */
export type ToolkitTransfer = {
	/**
	 * Builds an export file from records on this site, with the media they link to.
	 *
	 * @example
	 * ```ts
	 * const file = await toolkit.transfer.export({
	 *   actor: { type: "system" },
	 *   select: { documents: [{ collectionKey: "pages", ids: [1, 2] }] },
	 * });
	 * ```
	 */
	export: (
		input: ToolkitTransferExportInput,
	) => ServiceResponse<TransferExportFile>;
	/**
	 * Imports an export file, matching records already on this site by uid.
	 *
	 * @example
	 * ```ts
	 * await toolkit.transfer.import({
	 *   actor: { type: "system" },
	 *   file: JSON.parse(await readFile("./starter/export.json", "utf8")),
	 *   files: async (path) => ({
	 *     fileName: basename(path),
	 *     body: await readFile(join("./starter", path)),
	 *   }),
	 * });
	 * ```
	 */
	import: (
		input: ToolkitTransferImportInput,
	) => ServiceResponse<ToolkitTransferImportResult>;
};

/** Creates transfer helpers for a toolkit instance. */
export const createTransferToolkit = (
	context: ServiceContext,
): ToolkitTransfer => ({
	export: (input) => exportFile(context, input),
	import: (input) => importFile(context, input),
});

export default createTransferToolkit;
