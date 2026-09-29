import { expect, test } from "vitest";
import { Permissions } from "../permission/definitions.js";
import { agentTools } from "../tools/lucid-tools.js";
import {
	getCapabilityProviders,
	summariseCapabilities,
} from "./capabilities.js";

const tools = [
	...agentTools.web(),
	agentTools.analyzeResource(),
	...agentTools.content(),
];

test("combines tool capabilities into what an agent can do", () => {
	expect(
		summariseCapabilities(
			getCapabilityProviders({
				tools,
				can: (permission) => permission === Permissions.MediaRead,
			}),
		),
	).toEqual({
		media: {
			mimeTypes: expect.arrayContaining(["application/pdf", "video/mp4"]),
		},
		webSearch: true,
		webRead: true,
	});
});

test("media needs permission to read media, and web needs a web tool", () => {
	expect(
		summariseCapabilities(
			getCapabilityProviders({ tools: agentTools.content(), can: () => false }),
		),
	).toEqual({ media: null, webSearch: false, webRead: false });
	expect(getCapabilityProviders({ tools, can: () => false }).media).toEqual([]);
});
