import { copy } from "@lucidcms/core";
import type { ServiceFn } from "@lucidcms/core/types";
import { redirectFields } from "../../constants.js";
import type { RedirectIdentity, RedirectsConfig } from "../../types/types.js";
import findPageAtPath from "./find-page-at-path.js";

/** Rejects a redirect from a path a page already uses, since the page always wins and the redirect would never run. */
const checkRedirectSource: ServiceFn<
	[
		{
			config: RedirectsConfig;
			identity: RedirectIdentity;
			versionType: string;
		},
	],
	undefined
> = async (context, data) => {
	const pageRes = await findPageAtPath(context, {
		collections: data.config.collections,
		path: data.identity.from,
		environment: data.versionType,
		locale: data.identity.locale,
	});
	if (pageRes.error) return pageRes;
	if (!pageRes.data) return { error: undefined, data: undefined };

	const message = copy("server:plugin.pages.redirects.source.page");
	return {
		error: {
			type: "basic",
			status: 400,
			message,
			errors: {
				fields: [
					{
						key: redirectFields.from,
						localeCode: null,
						message,
					},
				],
			},
		},
		data: undefined,
	};
};

export default checkRedirectSource;
