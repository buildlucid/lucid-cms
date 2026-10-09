import { generateJSON } from "@lucidcms/rich-text/server";

const requestDetails = (
	input: { title?: string; description?: string } | undefined,
	defaultTitle: string,
) => ({
	title: input?.title ?? defaultTitle,
	description: input?.description ? generateJSON(input.description) : null,
});

export default requestDetails;
