import { expect, test } from "vitest";
import z from "zod";
import defineAgentTool from "../tools/define-agent-tool.js";
import { agentTools } from "../tools/lucid-tools.js";
import {
	getAvailableTools,
	getCapabilityProviders,
	summariseCapabilities,
} from "./capabilities.js";
import defineAgent from "./define-agent.js";

const noPermissions = { superAdmin: false, permissions: [] };
const tools = defineAgent({
	key: "test",
	name: "Test",
	description: "Test",
	tools: [agentTools.content()],
}).tools;

test("combines tool capabilities into what an agent can do", () => {
	expect(
		summariseCapabilities(
			getCapabilityProviders({
				tools,
			}),
		),
	).toEqual({
		mediaAnalysis: {
			mimeTypes: expect.arrayContaining(["application/pdf", "video/mp4"]),
		},
		fileRead: {
			mimeTypes: expect.arrayContaining([
				"text/plain",
				"text/html",
				"application/json",
			]),
		},
		webSearch: true,
		webRead: true,
	});
});

test("analysis needs an analysis tool but no library permissions", () => {
	expect(
		summariseCapabilities(
			getCapabilityProviders({
				tools: agentTools.content(),
			}),
		),
	).toEqual({
		mediaAnalysis: null,
		fileRead: null,
		webSearch: false,
		webRead: false,
	});
	expect(
		getCapabilityProviders({
			tools: getAvailableTools({ tools }, noPermissions),
		}).mediaAnalysis,
	).toHaveLength(1);
});

test("custom providers report support with Lucid's corresponding tools disabled", () => {
	const provider = defineAgentTool({
		name: "custom_analyze",
		description: "Analyses images and searches the web.",
		input: z.object({}),
		output: z.object({}),
		permissions: [],
		readOnly: true,
		capabilities: {
			mediaAnalysis: { mimeTypes: ["image/png"] },
			fileRead: { mimeTypes: ["text/plain"] },
			webSearch: true,
			webRead: true,
		},
		handler: async () => ({
			error: undefined,
			data: { output: {}, summary: "Analyzed the custom source." },
		}),
	});
	const agent = defineAgent({
		key: "custom",
		name: "Custom",
		description: "Custom providers",
		features: {
			media: { analyze: false, readFile: false },
			web: { search: false, read: false },
		},
		tools: [provider],
	});
	expect(
		summariseCapabilities(
			getCapabilityProviders({
				tools: getAvailableTools(agent, noPermissions),
			}),
		),
	).toEqual({
		mediaAnalysis: { mimeTypes: ["image/png"] },
		fileRead: { mimeTypes: ["text/plain"] },
		webSearch: true,
		webRead: true,
	});
});
