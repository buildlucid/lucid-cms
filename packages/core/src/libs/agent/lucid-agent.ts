import { copy } from "../i18n/copy.js";
import { agentTools } from "../tools/lucid-tools.js";
import defineAgent from "./define-agent.js";

/**
 * Lucid's general-purpose agent, with every built-in tool and feature.
 * @remarks Used when agents are enabled and definitions are omitted.
 * Include it in custom definitions to retain it, or use `lucid-agent` as a custom agent's key to retain existing chats and permissions.
 */
const lucidAgent = defineAgent({
	key: "lucid-agent",
	name: copy("admin:core.agents.lucid-agent.name", {
		defaultMessage: "Lucid Agent",
	}),
	description: copy("admin:core.agents.lucid-agent.description", {
		defaultMessage: "A general-purpose agent that can use every Lucid tool.",
	}),
	tools: [
		agentTools.read(),
		agentTools.edit(),
		agentTools.review(),
		agentTools.requests.update(),
		agentTools.requests.complete(),
		agentTools.requests.schedule(),
		agentTools.media.update(),
		agentTools.media.select(),
		agentTools.system(),
		agentTools.emails.resend(),
		agentTools.jobs.runSchedule(),
		agentTools.notifications.find(),
	],
	suggestions: [
		{
			title: copy("admin:core.agents.lucid-agent.suggestions.attention.title", {
				defaultMessage: "What needs my attention?",
			}),
			description: copy(
				"admin:core.agents.lucid-agent.suggestions.attention.description",
				{ defaultMessage: "See requests and notifications waiting on you." },
			),
			message: copy(
				"admin:core.agents.lucid-agent.suggestions.attention.message",
				{
					defaultMessage:
						"Show me what needs my attention: requests waiting for my review and unread notifications. Put the most urgent first.",
				},
			),
		},
		{
			title: copy("admin:core.agents.lucid-agent.suggestions.requests.title", {
				defaultMessage: "Review open requests",
			}),
			description: copy(
				"admin:core.agents.lucid-agent.suggestions.requests.description",
				{ defaultMessage: "Get a summary of pending changes." },
			),
			message: copy(
				"admin:core.agents.lucid-agent.suggestions.requests.message",
				{
					defaultMessage:
						"Summarise the open requests, what each one changes and what is blocking it. Do not comment or make changes.",
				},
			),
		},
		{
			title: copy("admin:core.agents.lucid-agent.suggestions.alt-text.title", {
				defaultMessage: "Fill in missing alt text",
			}),
			description: copy(
				"admin:core.agents.lucid-agent.suggestions.alt-text.description",
				{ defaultMessage: "Find images without descriptions." },
			),
			message: copy(
				"admin:core.agents.lucid-agent.suggestions.alt-text.message",
				{
					defaultMessage:
						"Find library images with missing or weak alt text. Suggest alt text for up to 10 of them and ask me before saving any.",
				},
			),
		},
		{
			title: copy("admin:core.agents.lucid-agent.suggestions.draft.title", {
				defaultMessage: "Draft a new page",
			}),
			description: copy(
				"admin:core.agents.lucid-agent.suggestions.draft.description",
				{ defaultMessage: "Start a page from a short brief." },
			),
			message: copy("admin:core.agents.lucid-agent.suggestions.draft.message", {
				defaultMessage:
					"Help me draft a new page. Ask me what it is for, then create it as a request I can review.",
			}),
		},
	],
});

export default lucidAgent;
