import type {
	AiContextEntry,
	LocalizationConfig,
} from "../../../types/config.js";
import type { SkillDefinition } from "../../skills/types.js";
import type { getCapabilityProviders } from "../capabilities.js";
import type { RunMode } from "../types.js";
import { agentInstructions } from "./agent.js";
import { capabilityInstructions } from "./capabilities.js";
import { chatInstructions } from "./chat.js";
import { environmentInstructions } from "./environment.js";
import { historyInstructions } from "./history.js";
import { type MemoryContext, memoryInstructions } from "./memories.js";
import { referenceInstructions } from "./references.js";
import { routineInstructions } from "./routine.js";
import { type ScreenContext, screenInstructions } from "./screen.js";
import { siteContextInstructions } from "./site-context.js";
import { skillInstructions } from "./skills.js";
import { terminologyInstructions } from "./terminology.js";

/** Identifies CMS-owned sections so the remote service can prepend its base prompt. */
export const instructionVersion = 1;

/** CMS-owned sections, in reading order. The API prepends its shared base once per request. */
const buildInstructions = (props: {
	agent: Parameters<typeof agentInstructions>[0];
	siteContext: readonly AiContextEntry[];
	localization: LocalizationConfig;
	mode: RunMode;
	/** Whether a person can answer the run's questions. */
	attended: boolean;
	skills: readonly Pick<SkillDefinition, "name" | "description">[];
	capabilities: ReturnType<typeof getCapabilityProviders>;
	hasHistory: boolean;
	screen?: ScreenContext;
	memory?: MemoryContext;
}) =>
	[
		agentInstructions(props.agent),
		terminologyInstructions,
		siteContextInstructions(props.siteContext),
		environmentInstructions(props.localization),
		props.mode === "chat"
			? chatInstructions
			: routineInstructions(props.attended),
		referenceInstructions,
		props.screen ? screenInstructions(props.screen) : "",
		capabilityInstructions(props.capabilities),
		skillInstructions(props.skills),
		//* keep memory changes near the end to preserve the cached prompt prefix
		props.memory ? memoryInstructions(props.memory) : "",
		props.hasHistory ? historyInstructions : "",
	]
		.filter(Boolean)
		.join("\n\n");

export default buildInstructions;
