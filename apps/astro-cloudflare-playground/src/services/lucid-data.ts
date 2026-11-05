import getPreview from "@lucidcms/astro/preview";
import getToolkit from "@lucidcms/astro/toolkit";
import type { AstroGlobal } from "astro";

export const pageLocales = ["en", "fr"] as const;
export type PageLocale = (typeof pageLocales)[number];

/** Resolves the supported locale from the first path segment. */
export const resolvePageLocale = (path: string): PageLocale | undefined => {
	const locale = path.split("/")[1];

	return pageLocales.find((supportedLocale) => supportedLocale === locale);
};

type GetLucidDataOptions = {
	path: string;
	locale: PageLocale;
	astro: Pick<
		AstroGlobal,
		"cookies" | "locals" | "request" | "response" | "url"
	>;
};

const getLucidData = async ({ path, locale, astro }: GetLucidDataOptions) => {
	const [toolkit, preview] = await Promise.all([
		getToolkit(astro),
		getPreview(astro),
	]);
	const activePreview = preview.data?.kind === "preview" ? preview.data : null;

	const [documentResponse, blogsResponse] = preview.error
		? [
				{ error: preview.error, data: undefined },
				{ error: preview.error, data: undefined },
			]
		: await Promise.all([
				toolkit.documents.getSingle({
					collectionKey: "page",
					version: "production",
					preview: activePreview?.token,
					locale,
					query: {
						filter: { _path: { value: path } },
						include: ["bricks", "meta"],
					},
				}),
				toolkit.documents.getMultiple({
					collectionKey: "blog",
					version: "production",
					preview: activePreview?.token,
					locale,
					query: {
						page: 1,
						perPage: 3,
						sort: [{ key: "createdAt", direction: "desc" }],
					},
				}),
			]);

	if (preview.error) {
		astro.response.status = preview.error.status ?? 401;
	} else if (documentResponse.error) {
		astro.response.status = documentResponse.error.status ?? 404;
	}

	const isPreviewError =
		preview.error !== undefined ||
		(activePreview !== null && documentResponse.error !== undefined);

	return {
		page: documentResponse.data,
		blogs: blogsResponse.data?.items ?? [],
		preview: preview.data,
		isPreviewError,
		isBlogError:
			preview.error === undefined && blogsResponse.error !== undefined,
	};
};

export default getLucidData;
