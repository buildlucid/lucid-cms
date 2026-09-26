import { defineAgent } from "@lucidcms/core";
import demoAgentSkill from "../skills/demo.js";
import { addAgentTool } from "../tools/add.js";
import { echoAgentTool } from "../tools/echo.js";
import { saveNoteTool } from "../tools/save-note.js";

export const assistantAgent = defineAgent({
	key: "assistant",
	name: "Assistant",
	description:
		"Answers questions about your content and tries out playground tools.",
	tools: [echoAgentTool, addAgentTool, saveNoteTool],
	skills: [demoAgentSkill],
});
