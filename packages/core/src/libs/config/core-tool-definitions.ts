import {
	describeCollectionAgentTool,
	describeCollectionTool,
} from "../../services/collections/tools/describe/index.js";
import {
	listCollectionsAgentTool,
	listCollectionsTool,
} from "../../services/collections/tools/list/index.js";
import {
	findDocumentsAgentTool,
	findDocumentsTool,
} from "../../services/documents/tools/find/index.js";
import {
	getDocumentAgentTool,
	getDocumentTool,
} from "../../services/documents/tools/get/index.js";
import {
	listLocalesAgentTool,
	listLocalesTool,
} from "../../services/locales/tools/list/index.js";
import {
	findMediaAgentTool,
	findMediaTool,
} from "../../services/media/tools/find/index.js";
import { previewMediaTool } from "../../services/media/tools/preview/index.js";
import type { ToolDefinition } from "../tools/types.js";

/** Built-in tools join the same registry as plugin and project tools. */
const coreToolDefinitions: ToolDefinition[] = [
	listCollectionsTool,
	listCollectionsAgentTool,
	describeCollectionTool,
	describeCollectionAgentTool,
	findDocumentsTool,
	findDocumentsAgentTool,
	getDocumentTool,
	getDocumentAgentTool,
	findMediaTool,
	findMediaAgentTool,
	previewMediaTool,
	listLocalesTool,
	listLocalesAgentTool,
];

export default coreToolDefinitions;
