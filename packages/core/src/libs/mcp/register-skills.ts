import { createHash } from "node:crypto";
import {
	INVALID_PARAMS,
	type McpServer,
	ProtocolError,
} from "@modelcontextprotocol/server";
import z from "zod";
import type { SkillDefinition } from "../skills/types.js";

/** The MCP skills extension (SEP-2640). */
const SKILLS_EXTENSION = "io.modelcontextprotocol/skills";

/** Skill listings vary by caller scopes and deploy, so clients should not reuse them. */
const cacheFields = { ttlMs: 0, cacheScope: "private" } as const;

const getSkillUri = (skill: SkillDefinition) =>
	`skill://${skill.name}/SKILL.md`;

/** Renders the Agent Skills `SKILL.md`. JSON strings are valid YAML scalars. */
const renderSkill = (skill: SkillDefinition) =>
	`---\nname: ${skill.name}\ndescription: ${JSON.stringify(skill.description)}\n---\n\n${skill.instructions}\n`;

/** Builds the listing entry clients use to verify `SKILL.md` before loading it. */
const createSkillEntry = (skill: SkillDefinition) => {
	const uri = getSkillUri(skill);
	const content = new TextEncoder().encode(renderSkill(skill));

	return {
		uri,
		frontmatter: { name: skill.name, description: skill.description },
		resources: [
			{
				uri,
				digest: `sha256:${createHash("sha256").update(content).digest("hex")}`,
				size: content.byteLength,
			},
		],
	};
};

/** Serves skills through the skills extension and as plain resources for other clients. */
export const registerSkills = (
	server: McpServer,
	skills: readonly SkillDefinition[],
) => {
	if (skills.length === 0) return;

	const skillsByUri = new Map(
		skills.map((skill) => [getSkillUri(skill), skill]),
	);
	for (const [uri, skill] of skillsByUri) {
		server.registerResource(
			skill.name,
			uri,
			{ description: skill.description, mimeType: "text/markdown" },
			async () => ({
				contents: [
					{ uri, mimeType: "text/markdown", text: renderSkill(skill) },
				],
			}),
		);
	}

	server.server.registerCapabilities({
		extensions: { [SKILLS_EXTENSION]: {} },
	});
	server.server.setRequestHandler(
		"skills/list",
		{ params: z.looseObject({}).optional() },
		() => ({ skills: skills.map(createSkillEntry), ...cacheFields }),
	);
	server.server.setRequestHandler(
		"skills/get",
		{ params: z.looseObject({ uri: z.string() }) },
		({ uri }) => {
			const skill = skillsByUri.get(uri);
			if (!skill) {
				throw new ProtocolError(INVALID_PARAMS, `No skill is served at ${uri}`);
			}

			return { skill: createSkillEntry(skill), ...cacheFields };
		},
	);
};
