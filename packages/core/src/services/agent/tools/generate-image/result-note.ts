import { builderUpdateToolName } from "../builder-update/constants.js";

const shownNote =
	"It is already shown in this chat and linked to it, so don't preview or link it again.";

const resultNote = (props: {
	library: boolean;
	canAddToLibrary: boolean;
	onDocument: boolean;
}) => {
	if (props.library) {
		return [
			"The image is saved in the media library as public media, ready to use in documents.",
			props.onDocument
				? `To put it in the open document, set it with ${builderUpdateToolName} now.`
				: "",
			shownNote,
		]
			.filter(Boolean)
			.join(" ");
	}

	return [
		"The image is saved as the person's personal media, so only they can see it until it is added to the library.",
		props.canAddToLibrary
			? "Add it to the library with media_add_to_library before using it in documents."
			: "",
		shownNote,
	]
		.filter(Boolean)
		.join(" ");
};

export default resultNote;
