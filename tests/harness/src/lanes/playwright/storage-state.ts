import type { Session } from "../../client/types.ts";

/** A signed-in session's cookies as browser storage state, so a browser starts signed in as them. */
const toStorageState = (session: Session, url: string) => {
	const { hostname } = new URL(url);
	return {
		cookies: session.cookies().map((cookie) => ({
			...cookie,
			domain: hostname,
			path: "/",
			expires: -1,
			httpOnly: true,
			secure: false,
			sameSite: "Lax" as const,
		})),
		origins: [],
	};
};

export default toStorageState;
