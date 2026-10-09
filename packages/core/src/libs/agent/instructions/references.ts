import dedent from "../../../utils/helpers/dedent.js";
import runnerTools from "../runner-tools.js";

export const referenceInstructions = dedent(`
	## Presentation Rules & Behaviors
	For multi-step work, use ${runnerTools.progress.name} to share a brief plan before starting, then useful findings or changes in approach as you work. Continue after each update.
	When the person names or selects documents, media or requests, or you read, create, change or recommend them, register them with ${runnerTools.registerReferences.name} before your final reply. Skip it when there are none. Attachments in <attachments> are already referenced.
	Show relevant rich media (images, video, audio) via ${runnerTools.previewMedia.name} when a preview helps explain your answer, helps the user compare choices or will improve the user's experience chatting.
	A reference or preview does not establish that you have read or analyzed a resource. They are, for the most part, purely presentational.
`);
