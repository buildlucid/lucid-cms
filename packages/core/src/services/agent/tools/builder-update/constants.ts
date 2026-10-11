import { copy } from "../../../../libs/i18n/index.js";
import type { AgentLucidToolName } from "../../../../types/response.js";

/** Avoids import cycles when instructions reference the tool name. */
export const builderUpdateToolName =
	"lucid_builder_update" satisfies AgentLucidToolName;

export const builderUpdateTitle = copy(
	"admin:core.tools.lucid_builder_update.title",
);
