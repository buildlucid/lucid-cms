import { beforeAll, expect, test } from "vitest";
import type { ResolvedLucidConfig } from "../../../types/config.js";
import getTestConfig from "../../../utils/test-helpers/get-test-config.js";
import { getAvailableTools } from "../capabilities.js";
import defineAgent from "../define-agent.js";
import { memoryInstructions } from "./memories.js";

let config: ResolvedLucidConfig;

beforeAll(async () => {
	config = await getTestConfig().getConfig();
});

test("memory tools are only offered in chats", () => {
	const agent = defineAgent({ key: "test", name: "Test", description: "Test" });
	const memoryTools = (mode?: "chat" | "routine") =>
		getAvailableTools(
			agent,
			{ superAdmin: false, permissions: [] },
			{ config, aiAccess: [], mode },
		)
			.map((tool) => tool.name)
			.filter((name) => name.startsWith("lucid_memory_"));

	expect(memoryTools("chat")).toEqual([
		"lucid_memory_save",
		"lucid_memory_delete",
	]);
	expect(memoryTools("routine")).toEqual([]);
	expect(
		defineAgent({
			key: "reader",
			name: "Reader",
			description: "Reader",
			features: { memory: { save: false } },
		}).tools.some((tool) => tool.name.startsWith("lucid_memory_")),
	).toBe(false);
});

test("instructions list memories and only explain saving when the agent can save", () => {
	const shared = {
		limit: 50,
		memories: [{ id: "a", content: "Use British spelling." }],
	};

	const routine = memoryInstructions({ shared, personal: null });
	expect(routine).toContain(
		'<shared_memories count="1" limit="50">\n<memory id="a">Use British spelling.</memory>\n</shared_memories>',
	);
	expect(routine).not.toContain("lucid_memory_save");

	const chat = memoryInstructions({
		shared,
		personal: { limit: 30, memories: [] },
		save: { scopes: ["personal"] },
	});
	expect(chat).toContain('<personal_memories count="0" limit="30" />');
	expect(chat).toContain("You can only propose personal memories.");

	expect(
		memoryInstructions({ shared: { limit: 50, memories: [] }, personal: null }),
	).toBe("");
});
