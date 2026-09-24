import { describeCollectionTool } from "../../services/collections/tools/describe/index.js";
import { listCollectionsTool } from "../../services/collections/tools/list/index.js";
import { findDocumentsTool } from "../../services/documents/tools/find/index.js";
import { getDocumentTool } from "../../services/documents/tools/get/index.js";
import { listLocalesTool } from "../../services/locales/tools/list/index.js";
import { findMediaTool } from "../../services/media/tools/find/index.js";
import { previewMediaTool } from "../../services/media/tools/preview/index.js";
import type { ToolDefinition } from "../tools/types.js";

/** Built-in tools join the same registry as plugin and project tools. */
const coreToolDefinitions: ToolDefinition[] = [
	listCollectionsTool,
	describeCollectionTool,
	findDocumentsTool,
	getDocumentTool,
	findMediaTool,
	previewMediaTool,
	listLocalesTool,
];

export default coreToolDefinitions;
