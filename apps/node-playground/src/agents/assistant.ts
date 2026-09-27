import { defineAgent } from "@lucidcms/core";
import demoAgentSkill from "../skills/demo.js";
import { addAgentTool } from "../tools/add.js";
import { echoAgentTool } from "../tools/echo.js";
import { reviewNoteTool } from "../tools/review-note.js";
import { saveNoteTool } from "../tools/save-note.js";
import { selectDocumentTool } from "../tools/select-document.js";

export const assistantAgent = defineAgent({
	key: "assistant",
	name: "Assistant",
	description:
		"Answers questions about your content and tries out playground tools.",
	tools: [
		echoAgentTool,
		addAgentTool,
		saveNoteTool,
		selectDocumentTool,
		reviewNoteTool,
	],
	skills: [demoAgentSkill],
});
