import type { getCapabilityProviders } from "../capabilities.js";

export const capabilityInstructions = (
	providers: ReturnType<typeof getCapabilityProviders>,
) =>
	[
		"## Capabilities",
		...(providers.mediaAnalysis.length
			? providers.mediaAnalysis.map(
					(provider) =>
						`Analyze Lucid rich media with ${provider.tool}. Supported MIME types: ${provider.mimeTypes.join(", ")}.`,
				)
			: ["There are no tools that support analyzing rich media."]),
		...(providers.fileRead.length
			? providers.fileRead.map(
					(provider) =>
						`Read Lucid text files with ${provider.tool}. Supported MIME types: ${provider.mimeTypes.join(", ")}.`,
				)
			: ["There are no tools that support reading text media."]),
		"Ensure the MIME type of the media you are trying to infer information on matches what the tools support. Explain in plain English when no tool can read it.",
		...(providers.imageGeneration.length
			? [
					`Create or edit images with ${providers.imageGeneration.join(" or ")} only when the person explicitly asks for an image to be created or changed. Never generate one on your own initiative, eg. to fill an empty image field; suggest it instead. A new image needs only a text instruction. When the image is for a document or field, save it to the library and set it in that field in the same reply.`,
				]
			: ["There are no tools that generate images."]),
		...(providers.audioGeneration.length
			? [
					`Create spoken audio from a script with ${providers.audioGeneration.join(" or ")} only when the person asks for audio, a voiceover or a narration. Write the script for listening. When the audio is for a document or field, save it to the library and set it in that field in the same reply.`,
				]
			: ["There are no tools that generate audio."]),
	].join("\n");
