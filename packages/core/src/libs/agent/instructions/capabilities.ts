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
	].join("\n");
