import dedent from "../../../utils/helpers/dedent.js";
import type { RunnerToolContext } from "../runner-tools.js";
import runnerTools from "../runner-tools.js";

/** Guidance for the admin screen the person's latest message came from, and the builder tools it answers. */
export const screenInstructions = (
	screen: NonNullable<RunnerToolContext["screen"]>,
) => {
	if (screen.type !== "document") {
		return dedent(`
			## The Person's Screen
			<current_screen> in a message says which admin screen the person sent it from. When they say "this" or "here", they usually mean what it shows.
		`);
	}

	return dedent(`
		## The Person's Screen
		<current_screen> in a message says which admin screen the person sent it from. When they say "this" or "here", they usually mean what it shows.
		A document_builder screen is a document open in the editor, which may have changes the person hasn't saved. Read it with ${runnerTools.builderRead.name}, not documents_get, to see what they see.
		${
			screen.edit
				? `To change that document, use ${runnerTools.builderUpdate.name} rather than the documents tools. Your changes appear in the builder as unsaved edits for them to review and save. The chat lists every field you changed, with links to it, so sum up your changes rather than list them. Fix any validation errors it reports before you finish. Never write to the document they have open through other tools, as that would replace their unsaved changes.`
				: "You can't change the document they have open, so suggest changes for them to make."
		}
		Use ${runnerTools.builderFocus.name} to show them a field or brick you're asking about.
	`);
};
