import getToolkit from "@lucidcms/astro/toolkit";
import { asDocument } from "@lucidcms/client";
import type { AstroGlobal } from "astro";

const previewCookieName = "lucid_preview";
export const pageLocales = ["en", "fr"] as const;
export type PageLocale = (typeof pageLocales)[number];

/** Resolves the supported locale from the first full-slug segment. */
export const resolvePageLocale = (fullSlug: string): PageLocale | undefined => {
	const locale = fullSlug.split("/")[1];

	return pageLocales.find((supportedLocale) => supportedLocale === locale);
};

type GetLucidDataOptions = {
	fullSlug: string;
	locale: PageLocale;
	astro: Pick<AstroGlobal, "cookies" | "response" | "url">;
};

const getLucidData = async ({
	fullSlug,
	locale,
	astro,
}: GetLucidDataOptions) => {
	const toolkit = await getToolkit();

	const [authentication, preview] = await Promise.all([
		toolkit.auth.status({
			cookies: {
				get: (name) => astro.cookies.get(name)?.value,
			},
			headers: {
				set: (name, value) => astro.response.headers.set(name, value),
			},
		}),
		toolkit.previews.state({
			url: astro.url,
			session: {
				get: () => astro.cookies.get(previewCookieName)?.value,
				set: ({ token, expiresAt }) => {
					astro.cookies.set(previewCookieName, token, {
						path: "/",
						httpOnly: true,
						secure: astro.url.protocol === "https:",
						sameSite: astro.url.protocol === "https:" ? "none" : "lax",
						expires: new Date(expiresAt),
					});
				},
				clear: () => {
					astro.cookies.delete(previewCookieName, {
						path: "/",
						httpOnly: true,
						secure: astro.url.protocol === "https:",
						sameSite: astro.url.protocol === "https:" ? "none" : "lax",
					});
				},
			},
			headers: {
				set: (name, value) => astro.response.headers.set(name, value),
			},
		}),
	]);

	const [documentResponse, blogsResponse] = preview.error
		? [
				{ error: preview.error, data: undefined },
				{ error: preview.error, data: undefined },
			]
		: await Promise.all([
				toolkit.documents.getSingle({
					collectionKey: "page",
					version: "production",
					preview: preview.data.token,
					query: {
						filter: { _fullSlug: { value: fullSlug } },
						include: ["bricks"],
					},
				}),
				toolkit.documents.getMultiple({
					collectionKey: "blog",
					version: "production",
					preview: preview.data.token,
					query: {
						include: ["refs.media"],
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

	const isDocumentError =
		preview.error === undefined && documentResponse.error !== undefined;
	const isBlogError =
		preview.error === undefined && blogsResponse.error !== undefined;

	const isPreviewError = preview.error
		? true
		: preview.data.active && isDocumentError;

	return {
		raw: {
			document: documentResponse,
			blogs: blogsResponse,
			preview,
			authentication,
		},
		document: asDocument(documentResponse.data, {
			locale,
			preview: preview.data?.active === true,
		}),
		blogs:
			blogsResponse.data?.data.map((blog) =>
				asDocument(blog, {
					locale,
					preview: preview.data?.active === true,
				}),
			) ?? [],
		isPreviewError,
		isDocumentError,
		isBlogError,
		isAuthenticationError: authentication.error !== undefined,
	};
};

export default getLucidData;
