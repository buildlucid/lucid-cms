import type { AgentLucidToolName } from "@lucidcms/types";

/** Avoids import cycles when instructions reference the tool name. */
export const builderFocusToolName =
	"lucid_builder_focus" satisfies AgentLucidToolName;
