import type { SkillDefinition } from "./types.js";

export const isSkillDefinition = (value: unknown): value is SkillDefinition =>
	typeof value === "object" &&
	value !== null &&
	"type" in value &&
	value.type === "skill-definition";
