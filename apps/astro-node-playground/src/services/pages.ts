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

type GetPageOptions = {
	fullSlug: string;
	locale: PageLocale;
	astro: Pick<AstroGlobal, "cookies" | "response" | "url">;
};

const getPage = async ({ fullSlug, locale, astro }: GetPageOptions) => {
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

	const documentResponse = preview.error
		? { error: preview.error, data: undefined }
		: await toolkit.documents.getSingle({
				collectionKey: "page",
				...(preview.data.active && preview.data.token
					? { preview: preview.data.token }
					: { status: "production" as const }),
				query: {
					filter: { _fullSlug: { value: fullSlug } },
					include: ["bricks"],
				},
			});

	if (preview.error) {
		astro.response.status = preview.error.status ?? 401;
	} else if (documentResponse.error) {
		astro.response.status = documentResponse.error.status ?? 404;
	}

	const isDocumentError =
		preview.error === undefined && documentResponse.error !== undefined;

	const isPreviewError = preview.error
		? true
		: preview.data.active && isDocumentError;

	return {
		raw: {
			document: documentResponse,
			preview,
			authentication,
		},
		document: asDocument(documentResponse.data, {
			locale,
			preview: preview.data?.active === true,
		}),
		isPreviewError,
		isDocumentError,
		isAuthenticationError: authentication.error !== undefined,
	};
};

export default getPage;
