import { beforeAll, expect, test } from "vitest";
import z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { Permissions } from "../permission/definitions.js";
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
	tools: [agentTools.read()],
}).tools;
let config: ResolvedLucidConfig;

beforeAll(async () => {
	config = await getTestConfig().getConfig();
});

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
		imageGeneration: true,
	});
});

test("analysis needs an analysis tool but no library permissions", () => {
	expect(
		summariseCapabilities(
			getCapabilityProviders({
				tools: agentTools.read(),
			}),
		),
	).toEqual({
		mediaAnalysis: null,
		fileRead: null,
		webSearch: false,
		webRead: false,
		imageGeneration: false,
	});
	expect(
		getCapabilityProviders({
			tools: getAvailableTools({ tools }, noPermissions, { config }),
		}).mediaAnalysis,
	).toHaveLength(1);
});

test("image generation needs its permission and the CMS feature, and is hidden without them", () => {
	const generate = {
		superAdmin: false,
		permissions: [Permissions.AiImageGenerate],
	};
	const providers = (grant: typeof generate, enabled = true) =>
		getCapabilityProviders({
			tools: getAvailableTools({ tools }, grant, {
				config: {
					...config,
					ai: {
						...config.ai,
						features: { ...config.ai.features, imageGeneration: enabled },
					},
				},
			}),
		});

	expect(providers(generate).imageGeneration).toEqual([
		"media_generate_image",
		"media_edit_image",
	]);
	expect(providers(noPermissions).imageGeneration).toEqual([]);
	expect(providers(generate, false).imageGeneration).toEqual([]);
	expect(summariseCapabilities(providers(generate)).imageGeneration).toBe(true);
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
				tools: getAvailableTools(agent, noPermissions, { config }),
			}),
		),
	).toEqual({
		mediaAnalysis: { mimeTypes: ["image/png"] },
		fileRead: { mimeTypes: ["text/plain"] },
		webSearch: true,
		webRead: true,
		imageGeneration: false,
	});
});
