import type { Capability } from "../capabilities/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import type { Mode } from "../setup/types.ts";
import openTarget from "../targets/open-target.ts";
import type { HostTargetOptions } from "../targets/types.ts";
import { ADMIN, login } from "./admin.ts";
import createSession from "./create-session.ts";
import type { Session } from "./types.ts";

/** The CMS under test, as tests see it. It works the same in every mode and setup. */
export type Lucid = {
	setup: string;
	mode: Mode;
	capabilities: readonly Capability[];
	/** The address of the CMS. Only reachable from outside the test process in served mode. */
	url: string;
	/** A new visitor who is not signed in. */
	session(): Session;
	/** A visitor signed in as the seeded super admin. Signs in once, then reuses the session. */
	admin(): Promise<Session>;
	close(): Promise<void>;
};

/** Opens the CMS for a lane run and wraps it in the helpers tests use. */
const openLucid = async (
	context: HarnessContext,
	options?: HostTargetOptions,
): Promise<Lucid> => {
	const target = await openTarget(context, options);
	const session = () =>
		createSession({ url: target.url, transport: target.transport });
	let admin: Promise<Session> | undefined;

	return {
		setup: context.setup.name,
		mode: context.mode,
		capabilities: context.capabilities,
		url: target.url,
		session,
		admin: () => {
			admin ??= (async () => {
				const signedIn = session();
				await login(signedIn, ADMIN);
				return signedIn;
			})();
			return admin;
		},
		close: target.close,
	};
};

export default openLucid;
