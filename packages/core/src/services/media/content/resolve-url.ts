import type { MediaResolveUrlOptions } from "@lucidcms/types";
import type { MediaUrl } from "../../../types/response.js";
import type { ServiceFn } from "../../../utils/services/types.js";
import resolveUrl from "../resolve-url.js";

const resolveUrlContent: ServiceFn<
	[
		{
			key: string;
			options: MediaResolveUrlOptions;
		},
	],
	MediaUrl
> = async (context, data) => resolveUrl(context, data);

export default resolveUrlContent;
