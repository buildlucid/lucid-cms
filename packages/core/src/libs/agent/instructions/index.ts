import type { SkillDefinition } from "../../skills/types.js";
import type { getCapabilityProviders } from "../capabilities.js";
import type { AgentDefinition, RunMode } from "../types.js";
import { agentInstructions } from "./agent.js";
import { capabilityInstructions } from "./capabilities.js";
import { chatInstructions } from "./chat.js";
import { historyInstructions } from "./history.js";
import { referenceInstructions } from "./references.js";
import { routineInstructions } from "./routine.js";
import { skillInstructions } from "./skills.js";
import { terminologyInstructions } from "./terminology.js";

/** Identifies CMS-owned sections so the remote service can prepend its base prompt. */
export const instructionVersion = 1;

/** CMS-owned sections, in reading order. The API prepends its shared base once per request. */
const buildInstructions = (props: {
	agent: Pick<AgentDefinition, "name" | "instructions">;
	mode: RunMode;
	skills: readonly Pick<SkillDefinition, "name" | "description">[];
	capabilities: ReturnType<typeof getCapabilityProviders>;
	hasHistory: boolean;
}) =>
	[
		agentInstructions(props.agent),
		terminologyInstructions,
		props.mode === "chat" ? chatInstructions : routineInstructions,
		referenceInstructions,
		capabilityInstructions(props.capabilities),
		skillInstructions(props.skills),
		props.hasHistory ? historyInstructions : "",
	]
		.filter(Boolean)
		.join("\n\n");

export default buildInstructions;
