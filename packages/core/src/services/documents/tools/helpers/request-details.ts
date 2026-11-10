import { generateJSON } from "@lucidcms/richtext/server";

const requestDetails = (
	input: { title?: string; description?: string } | undefined,
	defaultTitle: string,
) => ({
	title: input?.title ?? defaultTitle,
	description: input?.description ? generateJSON(input.description) : null,
});

export default requestDetails;
