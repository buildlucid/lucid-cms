import { existsSync } from "node:fs";
import path from "node:path";
import {
	describe,
	expect,
	login,
	type Lucid,
	notApplicable,
	requires,
	type Session,
	test,
} from "#harness/vitest";
import {
	callRoute,
	listPermissions,
	type Requirement,
	type RouteEntry,
	type RouteKey,
	requirementCases,
	resolveRoute,
	routes,
	setRolePermissions,
} from "#shared/helpers/permissions";

const entries = Object.entries(routes) as Array<[RouteKey, RouteEntry]>;

/** Routes of one kind, typed by it. */
const routesOf = <Kind extends RouteEntry["kind"]>(kind: Kind) =>
	entries.filter(
		(pair): pair is [RouteKey, Extract<RouteEntry, { kind: Kind }>] =>
			pair[1].kind === kind,
	);

/** Routes that need a permission, grouped by what they need. */
const byRequirement = [
	...Map.groupBy(routesOf("permission"), ([, entry]) =>
		JSON.stringify(entry.requirement),
	),
].map(([requirement, group]) => ({
	requirement: JSON.parse(requirement) as Requirement,
	routes: group,
}));

/** Routes that sign the caller out. */
const ENDS_SESSION: RouteKey[] = [
	"POST /api/v1/account/revoke-refresh-tokens",
	"POST /api/v1/auth/logout",
];

/** Keeps the routes a setup serves, leaving out those of plugins it doesn't have. */
const servedBy = <Entry extends RouteEntry>(
	lucid: Lucid,
	group: Array<[RouteKey, Entry]>,
) =>
	group.filter(
		([, entry]) =>
			entry.plugin === undefined ||
			lucid.capabilities.includes(`plugin:${entry.plugin}`),
	);

/** Refusals that mean the caller lacks access, not that the request was wrong. */
const REFUSED = [401, 403];

/** Sends each route's request and lists those whose status breaks the rule, with what they gave. */
const findBroken = async (
	session: Session,
	group: Array<[RouteKey, RouteEntry]>,
	rule: (status: number) => boolean,
) => {
	const broken: string[] = [];
	for (const [key, entry] of group) {
		const response = await callRoute(session, key, entry);
		if (!rule(response.status)) {
			broken.push(
				`${key} gave ${response.status}: ${JSON.stringify(response.body)}`,
			);
		}
	}
	//* one line per route, so a failure prints every one in full
	return broken.join("\n");
};

/** One user for the whole file, whose role each test changes. */
let shared:
	| Promise<{ session: Session; roleId: number; all: string[] }>
	| undefined;
const useMember = (lucid: Lucid) => {
	shared ??= (async () => {
		const user = await lucid.user({ permissions: [] });
		const all = await listPermissions(await lucid.admin());
		if (user.roleId === null) {
			throw new Error("The user was made without a role.");
		}
		return { session: user.session, roleId: user.roleId, all };
	})();
	return shared;
};

describe("route access", () => {
	requires("harness:outbox", "feature:openAPI");

	test("every route the CMS serves has an access rule", async ({ lucid }) => {
		const served = await lucid
			.session()
			.request<{ paths: Record<string, Record<string, unknown>> }>({
				path: "/api/openapi",
			});
		expect(served.status).toBe(200);

		const servedKeys = Object.entries(served.body.paths).flatMap(
			([route, methods]) =>
				Object.keys(methods).map(
					(method) => `${method.toUpperCase()} ${route}`,
				),
		);
		const listed = new Set<string>(Object.keys(routes));

		expect(
			servedKeys.filter((key) => !listed.has(key)),
			"Routes with no rule in shared/helpers/permissions.ts",
		).toEqual([]);
		expect(
			servedBy(lucid, entries)
				.map(([key]) => key)
				.filter((key) => !servedKeys.includes(key)),
			"Rules for routes the CMS no longer serves",
		).toEqual([]);
	});

	test("routes checked elsewhere name a test file that exists", () => {
		const missing = routesOf("elsewhere").filter(
			([, entry]) => !existsSync(path.join(import.meta.dirname, entry.file)),
		);
		expect(missing.map(([key, entry]) => `${key}: ${entry.file}`)).toEqual([]);
	});

	test("refuses visitors every route that needs a sign-in", async ({
		lucid,
	}) => {
		const visitor = lucid.session();
		const signedIn = servedBy(lucid, entries).filter(
			([, entry]) =>
				entry.kind === "signedIn" ||
				entry.kind === "permission" ||
				entry.kind === "elsewhere" ||
				entry.kind === "scope",
		);

		//* a GET that changes state also needs the CSRF token, so a visitor without one gets 403
		expect(
			await findBroken(visitor, signedIn, (status) => REFUSED.includes(status)),
		).toBe("");
	});

	test("lets a user with no permissions use the routes open to everyone signed in", async ({
		lucid,
	}) => {
		const { session, credentials } = await lucid.user({ permissions: [] });
		const signedIn = servedBy(lucid, routesOf("signedIn"));
		const broken = [
			await findBroken(
				session,
				signedIn.filter(([key]) => !ENDS_SESSION.includes(key)),
				(status) => !REFUSED.includes(status),
			),
		];

		//* each of these signs the session out, so each gets a session of its own
		for (const ending of signedIn.filter(([key]) =>
			ENDS_SESSION.includes(key),
		)) {
			const fresh = lucid.session();
			await login(fresh, credentials);
			broken.push(
				await findBroken(
					fresh,
					[ending],
					(status) => !REFUSED.includes(status),
				),
			);
		}

		expect(broken.filter(Boolean).join("\n")).toBe("");
	});

	test.for(byRequirement)(
		"routes needing $requirement refuse users without it",
		async ({ requirement, routes: group }, { lucid, skip }) => {
			const served = servedBy(lucid, group);
			skip(
				served.length === 0,
				notApplicable("The setup has none of these routes."),
			);
			const admin = await lucid.admin();
			const member = await useMember(lucid);
			const { misses } = requirementCases(requirement, member.all);

			for (const permissions of misses) {
				await setRolePermissions(admin, member.roleId, permissions);
				expect(
					await findBroken(member.session, served, (status) => status === 403),
					`Holding everything but ${JSON.stringify(requirement)}`,
				).toBe("");
			}
		},
	);

	test.for(byRequirement)(
		"routes needing $requirement let users with only that through",
		async ({ requirement, routes: group }, { lucid, skip }) => {
			const allowed = servedBy(lucid, group).filter(
				([, entry]) => !entry.skipAllowed,
			);
			skip(
				allowed.length === 0,
				notApplicable("The setup has none of these routes to call."),
			);
			const admin = await lucid.admin();
			const member = await useMember(lucid);
			const { meets } = requirementCases(requirement, member.all);

			for (const permissions of meets) {
				await setRolePermissions(admin, member.roleId, permissions);
				expect(
					await findBroken(
						member.session,
						allowed,
						(status) => !REFUSED.includes(status),
					),
					`Holding only ${JSON.stringify(permissions)}`,
				).toBe("");
			}
		},
	);

	test("content API routes need an API key with their scope", async ({
		lucid,
	}) => {
		const admin = await lucid.admin();
		/** Makes an API key with the scopes, and returns its bearer header. */
		const createKey = async (scopes: string[]) => {
			const created = await admin.request<{ data: { apiKey: string } }>({
				method: "POST",
				path: "/api/v1/integrations",
				body: { name: `Key for ${scopes.join(", ")}`, scopes },
			});
			expect(created.status).toBe(201);
			return { authorization: `Bearer ${created.body.data.apiKey}` };
		};
		const broken: string[] = [];

		for (const [key, entry] of servedBy(lucid, routesOf("scope"))) {
			const { method, path: routePath } = resolveRoute(key, entry);
			//* every key holds a scope, so it is refused for the scope and not for having none
			const other =
				entry.scope === "locales:read" ? "media:read" : "locales:read";
			const cases = [
				{ headers: await createKey([other]), refused: true },
				{ headers: await createKey([entry.scope]), refused: false },
			];

			for (const { headers, refused } of cases) {
				const response = await lucid.session().fetch(routePath, {
					method,
					headers,
				});
				const wrong = refused
					? response.status !== 403
					: REFUSED.includes(response.status);
				if (wrong) {
					broken.push(
						`${key} with${refused ? "out" : ""} ${entry.scope} gave ${response.status}: ${await response.text()}`,
					);
				}
			}
		}

		expect(broken.join("\n")).toBe("");
	});
});
