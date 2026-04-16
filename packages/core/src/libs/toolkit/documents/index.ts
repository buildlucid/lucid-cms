import type { ServiceContext } from "../../../utils/services/types.js";
import type { ToolkitDocuments } from "../types.js";
import getMultiple from "./get-multiple.js";
import getSingle from "./get-single.js";

export const createDocumentsToolkit = (
	context: ServiceContext,
): ToolkitDocuments => ({
	getMultiple: (input) => getMultiple(context, input),
	getSingle: (input) => getSingle(context, input),
});

export default createDocumentsToolkit;
