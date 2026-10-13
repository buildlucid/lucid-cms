import type { MediaGenerationType } from "../../../types/response.js";
import { addMediaToLibraryToolName } from "../../media/tools/add-to-library/constants.js";
import { builderUpdateToolName } from "../tools/builder-update/constants.js";

const shownNote =
	"It is already shown in this chat and linked to it, so don't preview or link it again.";

/** Tells the agent where generated media was saved and what to do with it next. */
const generatedMediaNote = (props: {
	/** What was generated. */
	noun: MediaGenerationType;
	library: boolean;
	/** The agent offers the add-to-library tool and the person can create media. */
	canAddToLibrary: boolean;
	onDocument: boolean;
}) => {
	if (props.library) {
		return [
			`The ${props.noun} is saved in the media library, where it is public and ready to use in documents.`,
			props.onDocument
				? `To put it in the open document, set it with ${builderUpdateToolName} now.`
				: "",
			shownNote,
		]
			.filter(Boolean)
			.join(" ");
	}

	return [
		`The ${props.noun} is saved as the person's personal media, so only they can see it until it is added to the library.`,
		props.canAddToLibrary
			? `Add it to the library with ${addMediaToLibraryToolName} before using it in documents.`
			: "",
		shownNote,
	]
		.filter(Boolean)
		.join(" ");
};

export default generatedMediaNote;
