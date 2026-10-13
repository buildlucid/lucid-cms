import { beforeAll, expect, test } from "vitest";
import z from "zod";
import type { ResolvedLucidConfig } from "../../types/config.js";
import type { AiAccessFeature } from "../../types/response.js";
import getTestConfig from "../../utils/test-helpers/get-test-config.js";
import { aiAccessFeatureSchema } from "../lucid-remote/schema/connection.js";
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
const aiAccess = aiAccessFeatureSchema.options;
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
		media: {
			analyze: {
				mimeTypes: expect.arrayContaining(["application/pdf", "audio/mpeg"]),
			},
			readFile: {
				mimeTypes: expect.arrayContaining([
					"text/plain",
					"text/html",
					"application/json",
				]),
			},
			generate: { image: true, audio: true },
		},
		web: { search: true, read: true },
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
		media: {
			analyze: null,
			readFile: null,
			generate: { image: false, audio: false },
		},
		web: { search: false, read: false },
	});
	expect(
		getCapabilityProviders({
			tools: getAvailableTools({ tools }, noPermissions, { config, aiAccess }),
		}).media.analyze,
	).toHaveLength(1);
});

test("media generation needs its permission and the CMS feature, and is hidden without them", () => {
	const generate = {
		superAdmin: false,
		permissions: [Permissions.AiImageGenerate, Permissions.AiAudioGenerate],
	};
	const providers = (grant: typeof generate, enabled = true) =>
		getCapabilityProviders({
			tools: getAvailableTools({ tools }, grant, {
				aiAccess,
				config: {
					...config,
					ai: {
						...config.ai,
						mediaGeneration: {
							image: { ...config.ai.mediaGeneration.image, enabled },
							audio: { ...config.ai.mediaGeneration.audio, enabled },
						},
					},
				},
			}),
		});

	expect(providers(generate).media.generate).toEqual({
		image: ["media_generate_image", "media_edit_image"],
		audio: ["media_generate_audio"],
	});
	expect(providers(noPermissions).media.generate).toEqual({
		image: [],
		audio: [],
	});
	expect(providers(generate, false).media.generate).toEqual({
		image: [],
		audio: [],
	});
	expect(summariseCapabilities(providers(generate)).media.generate).toEqual({
		image: true,
		audio: true,
	});
});

test("tools for features the organisation turns off are not offered", () => {
	const grant = {
		superAdmin: false,
		permissions: [Permissions.AiImageGenerate, Permissions.AiAudioGenerate],
	};
	const enabled = {
		...config,
		ai: {
			...config.ai,
			mediaGeneration: {
				image: { ...config.ai.mediaGeneration.image, enabled: true },
				audio: { ...config.ai.mediaGeneration.audio, enabled: true },
			},
		},
	};
	const capabilities = (access: readonly AiAccessFeature[]) =>
		summariseCapabilities(
			getCapabilityProviders({
				tools: getAvailableTools({ tools }, grant, {
					config: enabled,
					aiAccess: access,
				}),
			}),
		);

	expect(capabilities(aiAccess)).toMatchObject({
		media: {
			analyze: { mimeTypes: expect.any(Array) },
			generate: { image: true, audio: true },
		},
		web: { search: true, read: true },
	});
	//* reading text files runs in the CMS, so the organisation can't turn it off
	expect(capabilities(["agent"])).toEqual({
		media: {
			analyze: null,
			readFile: { mimeTypes: expect.any(Array) },
			generate: { image: false, audio: false },
		},
		web: { search: false, read: false },
	});
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
			media: {
				analyze: { mimeTypes: ["image/png"] },
				readFile: { mimeTypes: ["text/plain"] },
			},
			web: { search: true, read: true },
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
				tools: getAvailableTools(agent, noPermissions, { config, aiAccess }),
			}),
		),
	).toEqual({
		media: {
			analyze: { mimeTypes: ["image/png"] },
			readFile: { mimeTypes: ["text/plain"] },
			generate: { image: false, audio: false },
		},
		web: { search: true, read: true },
	});
});
