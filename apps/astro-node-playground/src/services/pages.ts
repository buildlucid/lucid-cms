import getToolkit from "@lucidcms/astro/toolkit";
import type { AstroGlobal } from "astro";

const previewCookieName = "lucid_preview";

type GetPageOptions = {
	fullSlug: string;
	astro: Pick<AstroGlobal, "cookies" | "response" | "url">;
};

const getPage = async ({ fullSlug, astro }: GetPageOptions) => {
	const toolkit = await getToolkit();

	const preview = await toolkit.previews.handleRequest({
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
	});
	if (preview.error) {
		return {
			page: { error: preview.error, data: undefined },
			preview,
		};
	}

	//* if the preview is active, use the preview token to fetch the page
	if (preview.data.active && preview.data.token) {
		const pageRes = await toolkit.documents.getSingle({
			collectionKey: "page",
			preview: preview.data.token,
			query: {
				filter: { _fullSlug: { value: fullSlug } },
				include: ["bricks"],
			},
		});

		return {
			page: pageRes,
			preview,
		};
	}

	//* if the preview is not active, fetch the page from production
	const pageRes = await toolkit.documents.getSingle({
		collectionKey: "page",
		status: "production",
		query: {
			filter: { _fullSlug: { value: fullSlug } },
			include: ["bricks"],
		},
	});

	return {
		page: pageRes,
		preview,
	};
};

export default getPage;
