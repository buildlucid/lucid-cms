import { agentTools, defineAgent } from "@lucidcms/core";
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
		agentTools.content(),
		agentTools.web(),
		agentTools.analyzeMedia(),
		echoAgentTool,
		addAgentTool,
		saveNoteTool,
		selectDocumentTool,
		reviewNoteTool,
	],
	suggestions: [
		{
			title: "Find content to review",
			description: "Get a quick tour of what's in this CMS.",
			message:
				"Give me a concise overview of the content in this CMS. Highlight anything that may need review, without making changes.",
		},
		{
			title: "Try a quick calculation",
			description: "See how this agent uses its tools.",
			message: "What is 18 + 24? Use the add tool to check your answer.",
		},
		{
			title: "Review page titles",
			description: "Find titles that could be clearer.",
			message:
				"Review page titles and suggest the three most useful improvements. Do not make changes.",
		},
		{
			title: "Spot metadata gaps",
			description: "Find missing descriptions and slugs.",
			message:
				"Find pages with missing or weak SEO metadata. List concrete fixes, but do not make changes.",
		},
	],
	skills: [demoAgentSkill],
});
