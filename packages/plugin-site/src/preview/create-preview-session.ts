import type { LucidHonoContext } from "@lucidcms/core/types";
import { deleteCookie, getCookie, setCookie } from "hono/cookie";
import { PREVIEW_COOKIE } from "../constants.js";

const createPreviewSession = (hono: LucidHonoContext) => {
	const secure = new URL(hono.req.url).protocol === "https:";

	return {
		get: () => getCookie(hono, PREVIEW_COOKIE),
		set: (session: { token: string; expiresAt: string }) => {
			setCookie(hono, PREVIEW_COOKIE, session.token, {
				path: "/",
				httpOnly: true,
				secure,
				sameSite: "Lax",
				expires: new Date(session.expiresAt),
			});
		},
		clear: () => {
			deleteCookie(hono, PREVIEW_COOKIE, { path: "/", secure });
		},
	};
};

export default createPreviewSession;
