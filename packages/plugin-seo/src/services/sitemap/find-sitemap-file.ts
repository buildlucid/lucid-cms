import { copy } from "@lucidcms/core";
import type { ServiceResponse } from "@lucidcms/core/types";
import type { SitemapFileGroup } from "./split-files.js";

/** Finds one file of the sitemap by name, or a 404 when it has none by that name. */
const findSitemapFile = (
	groups: SitemapFileGroup[],
	name: string,
): Awaited<ServiceResponse<SitemapFileGroup>> => {
	const group = groups.find((item) => item.file.name === name);
	if (group) return { error: undefined, data: group };

	return {
		error: {
			type: "basic",
			status: 404,
			message: copy("server:plugin.seo.sitemap.file.not.found", {
				data: { file: name },
			}),
		},
		data: undefined,
	};
};

export default findSitemapFile;
