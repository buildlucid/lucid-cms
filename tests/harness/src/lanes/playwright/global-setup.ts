import path from "node:path";
import openLucid from "../../client/open-lucid.ts";
import loadContext from "../../environment/load-context.ts";
import { writeJson } from "../../utils/json.ts";

/** The saved browser state that starts every test signed in as the admin. */
export const STORAGE_STATE_FILE = "admin-storage-state.json";

/** Signs the admin in once over the API and saves the cookies for every browser test to start with. */
const globalSetup = async (): Promise<void> => {
	const context = loadContext();
	const lucid = await openLucid(context);
	const admin = await lucid.admin();
	const { hostname } = new URL(lucid.url);

	await writeJson(path.join(context.paths.work, STORAGE_STATE_FILE), {
		cookies: admin.cookies().map((cookie) => ({
			...cookie,
			domain: hostname,
			path: "/",
			expires: -1,
			httpOnly: true,
			secure: false,
			sameSite: "Lax",
		})),
		origins: [],
	});
	await lucid.close();
};

export default globalSetup;
