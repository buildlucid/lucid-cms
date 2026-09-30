import { expect, test } from "vitest";
import { Permissions } from "../permission/definitions.js";
import { agentTools } from "../tools/lucid-tools.js";
import {
	getCapabilityProviders,
	summariseCapabilities,
} from "./capabilities.js";

const noPermissions = { superAdmin: false, permissions: [] };
const tools = [
	...agentTools.web(),
	agentTools.analyzeMedia(),
	...agentTools.content(),
];

test("combines tool capabilities into what an agent can do", () => {
	expect(
		summariseCapabilities(
			getCapabilityProviders({
				tools,
				grant: { superAdmin: false, permissions: [Permissions.MediaRead] },
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
			getCapabilityProviders({
				tools: agentTools.content(),
				grant: noPermissions,
			}),
		),
	).toEqual({ media: null, webSearch: false, webRead: false });
	expect(getCapabilityProviders({ tools, grant: noPermissions }).media).toEqual(
		[],
	);
});
