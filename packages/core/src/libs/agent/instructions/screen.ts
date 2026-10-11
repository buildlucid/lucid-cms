import { builderFocusToolName } from "../../../services/agent/tools/builder-focus/constants.js";
import { builderReadToolName } from "../../../services/agent/tools/builder-read/constants.js";
import { builderUpdateToolName } from "../../../services/agent/tools/builder-update/constants.js";
import type { AgentScreen } from "../../../types/response.js";
import dedent from "../../../utils/helpers/dedent.js";
import type { AgentFeatures } from "../types.js";

/** The originating admin screen and its available builder tools. */
export type ScreenContext = {
	type: AgentScreen["type"];
	builder: AgentFeatures["builder"];
};

/** Guidance for the admin screen the person's latest message came from, and the builder tools it answers. */
export const screenInstructions = (screen: ScreenContext) => {
	const intro = dedent(`
		## The Person's Screen
		<current_screen> in a message says which admin screen the person sent it from. When they say "this" or "here", they usually mean what it shows. A list screen's filter is the filter preset they applied, while items they picked from a list arrive in <attachments>.
	`);
	if (screen.type !== "document" || !screen.builder.read) return intro;

	const builder = dedent(`
		A document_builder screen is a document open in the editor, which may have changes the person hasn't saved. Read it with ${builderReadToolName}, not documents_get, to see what they see.
		${
			screen.builder.edit
				? `To change that document, use ${builderUpdateToolName} rather than the documents tools. Your changes appear in the builder as unsaved edits for them to review and save. The chat lists every field you changed, with links to it, so sum up your changes rather than list them. Fix any validation errors it reports before you finish. Never write to the document they have open through other tools, as that would replace their unsaved changes.`
				: "You can't change the document they have open, so suggest changes for them to make."
		}
		Use ${builderFocusToolName} to show them a field or brick you're asking about.
	`);
	return `${intro}\n${builder}`;
};
