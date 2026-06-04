import { copy } from "../../i18n/index.js";
import type { CustomFieldGuidanceConfig } from "./types.js";

export const defaultTextFieldAiGuidance = [
	{
		key: "improve",
		label: copy("admin:core.ai.guidance.improve.label", {
			defaultMessage: "Improve",
		}),
		instructions:
			"Improve the writing while preserving the original meaning and important details.",
	},
	{
		key: "expand",
		label: copy("admin:core.ai.guidance.expand.label", {
			defaultMessage: "Expand",
		}),
		instructions:
			"Expand the writing with useful detail while staying relevant and accurate.",
	},
	{
		key: "shorten",
		label: copy("admin:core.ai.guidance.shorten.label", {
			defaultMessage: "Shorten",
		}),
		instructions:
			"Make the writing shorter while preserving the important details and meaning.",
	},
] satisfies CustomFieldGuidanceConfig[];
