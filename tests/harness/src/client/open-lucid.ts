import type { KyselyDB } from "@lucidcms/core/types";
import type { OutboxEmail } from "../../../shared/fragments/outbox.ts";
import type { Variant } from "../../../shared/variants.ts";
import type { Capability } from "../capabilities/types.ts";
import type { HarnessContext } from "../environment/types.ts";
import type { Mode } from "../setup/types.ts";
import openTarget from "../targets/open-target.ts";
import type { HostTargetOptions } from "../targets/types.ts";
import { ADMIN, login, loginWithMagicLink } from "./admin.ts";
import createSession from "./create-session.ts";
import inviteUser, {
	type Invitation,
	type InvitedUser,
	type InviteOptions,
	sendInvitation,
} from "./invite-user.ts";
import type { Session } from "./types.ts";
import waitForEmail, { type EmailMatch, listEmails } from "./wait-for-email.ts";

/** The CMS under test, as tests see it. It works the same in every mode and setup. */
export type Lucid = {
	setup: string;
	mode: Mode;
	capabilities: readonly Capability[];
	/** The variant of the setup's config the CMS runs with, if any. */
	variant: Variant | undefined;
	/** The address of the CMS. Only reachable from outside the test process in served mode. */
	url: string;
	/**
	 * The folder Node setups store uploads in. In host mode it holds only this CMS's files; the
	 * served server shares one with every test.
	 */
	uploads: string;
	/**
	 * Runs queries on the CMS's database, for what the API cannot show, such as a counter it keeps
	 * to itself. Host mode only, so call `requires("mode:host")`.
	 */
	query<Result>(use: (kysely: KyselyDB) => Promise<Result>): Promise<Result>;
	/** A new visitor who is not signed in. */
	session(): Session;
	/**
	 * A visitor signed in as the seeded super admin. Signs in once, then reuses the session, which
	 * renews itself when its access token expires.
	 */
	admin(): Promise<Session>;
	/**
	 * Creates and signs in a new user. Requires `harness:outbox`. Optional `permissions` creates a
	 * dedicated role with exactly those grants.
	 */
	user(options?: InviteOptions): Promise<InvitedUser>;
	/** Invites a new user without accepting, for tests of how invitations are accepted. */
	invite(options?: InviteOptions): Promise<Invitation>;
	/** The emails this CMS sent that match, oldest first. Served mode shares one outbox. */
	emails(match: EmailMatch): Promise<OutboxEmail[]>;
	/** Waits for an email this CMS sent and returns the newest. `after` waits for one more than that many. */
	email(match: EmailMatch & { after?: number }): Promise<OutboxEmail>;
	close(): Promise<void>;
};

/** Opens the CMS for a lane run and wraps it in the helpers tests use. */
const openLucid = async (
	context: HarnessContext,
	options?: HostTargetOptions,
): Promise<Lucid> => {
	const target = await openTarget(context, options);
	const variant = options?.variant;
	const session = () =>
		createSession({ url: target.url, transport: target.transport });
	let admin: Promise<Session> | undefined;
	const signInAdmin = () => {
		admin ??= (async () => {
			//* the admin carries on past expired access tokens, as tests act through it
			const signedIn = createSession({
				url: target.url,
				transport: target.transport,
				renews: true,
			});
			if (variant === "passwordless") {
				await loginWithMagicLink(signedIn, {
					email: ADMIN.email,
					outbox: target.outbox,
				});
			} else {
				await login(signedIn, ADMIN, { captcha: variant === "captcha" });
			}
			return signedIn;
		})();
		return admin;
	};

	return {
		setup: context.setup.name,
		mode: context.mode,
		capabilities: context.capabilities,
		variant,
		url: target.url,
		uploads: target.uploads,
		query: (use) => {
			if (!target.query) {
				throw new Error(
					'The database can only be queried in host mode. Call requires("mode:host").',
				);
			}
			return target.query(use);
		},
		session,
		admin: signInAdmin,
		user: async (invite = {}) =>
			inviteUser({
				admin: await signInAdmin(),
				visitor: session(),
				outbox: target.outbox,
				invite,
				variant,
			}),
		invite: async (invite = {}) =>
			sendInvitation({
				admin: await signInAdmin(),
				outbox: target.outbox,
				invite,
			}),
		emails: (match) => listEmails(target.outbox, match),
		email: (match) => waitForEmail(target.outbox, match),
		close: target.close,
	};
};

export default openLucid;
