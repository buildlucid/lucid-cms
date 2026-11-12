import {
	action,
	describe,
	expect,
	fc,
	requires,
	type SimulationContext,
	simulation,
} from "#harness/simulation";
import type { Session } from "#harness/vitest";
import { createRole } from "#shared/helpers/permissions";

/** Permissions the simulation hands out, each with a read that needs only it. */
const PROBES = {
	"documents:story:read": "/api/v1/documents/story/latest",
	"documents:page:read": "/api/v1/documents/page/latest",
	"email:read": "/api/v1/emails",
	"jobs:read": "/api/v1/jobs",
	"requests:read": "/api/v1/requests",
} as const;

type Permission = keyof typeof PROBES;

const PERMISSIONS = Object.keys(PROBES) as Permission[];
const MAX_USERS = 3;

type User = { id: number; session: Session; roles: Set<number> };

/** Roles by ID with what they hold, and the users made, with their roles. */
type Model = {
	roles: Map<number, Set<Permission>>;
	users: User[];
};

type Context = SimulationContext<Model>;

const permissions = fc.subarray(PERMISSIONS);
/** Indexes into whatever roles exist when the action runs, so a sequence still shrinks. */
const roleChoices = fc.uniqueArray(fc.nat(), { maxLength: 3 });

const pickRoles = (model: Model, choices: number[]) => {
	const ids = [...model.roles.keys()];
	return [...new Set(choices.map((choice) => ids[choice % ids.length]))].filter(
		(id): id is number => id !== undefined,
	);
};

const pickRole = (model: Model, choice: number) => {
	const id = [...model.roles.keys()][choice % model.roles.size];
	if (id === undefined) {
		throw new Error(
			"No role exists. The action's `when` should rule this out.",
		);
	}
	return id;
};

const hasRoles = (model: Model) => model.roles.size > 0;

const createRoleAction = action<Model, Permission[]>({
	name: "createRole",
	input: permissions,
	run: async ({ admin, model, input }) => {
		const id = await createRole(admin, input);
		model.roles.set(id, new Set(input));
	},
});

const updateRole = action<Model, { role: number; permissions: Permission[] }>({
	name: "updateRole",
	input: fc.record({ role: fc.nat(), permissions }),
	when: hasRoles,
	run: async ({ admin, model, input }) => {
		const id = pickRole(model, input.role);
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/roles/${id}`,
			body: { permissions: input.permissions },
		});
		expect(updated.status).toBe(204);
		model.roles.set(id, new Set(input.permissions));
	},
});

const deleteRole = action<Model, number>({
	name: "deleteRole",
	input: fc.nat(),
	when: hasRoles,
	run: async ({ admin, model, input }) => {
		const id = pickRole(model, input);
		const deleted = await admin.request({
			method: "DELETE",
			path: `/api/v1/roles/${id}`,
		});
		expect(deleted.status).toBe(204);
		model.roles.delete(id);
		for (const user of model.users) {
			user.roles.delete(id);
		}
	},
});

const inviteUser = action<Model, number[]>({
	name: "inviteUser",
	input: roleChoices,
	when: (model) => model.users.length < MAX_USERS,
	run: async ({ lucid, model, input }) => {
		const roleIds = pickRoles(model, input);
		const { id, session } = await lucid.user({ roleIds });
		model.users.push({ id, session, roles: new Set(roleIds) });
	},
});

const setUserRoles = action<Model, { user: number; roles: number[] }>({
	name: "setUserRoles",
	input: fc.record({ user: fc.nat(), roles: roleChoices }),
	when: (model) => model.users.length > 0,
	run: async ({ admin, model, input }) => {
		const user = model.users[input.user % model.users.length];
		if (!user) {
			throw new Error(
				"No user exists. The action's `when` should rule this out.",
			);
		}
		const roleIds = pickRoles(model, input.roles);
		const updated = await admin.request({
			method: "PATCH",
			path: `/api/v1/users/${user.id}`,
			body: { roleIds },
		});
		expect(updated.status).toBe(204);
		user.roles = new Set(roleIds);
	},
});

/** What a user holds now: everything any of their roles holds. */
const heldBy = (model: Model, user: User) =>
	new Set(
		[...user.roles].flatMap((roleId) => [...(model.roles.get(roleId) ?? [])]),
	);

const invariants = {
	"each user is let through exactly the reads their roles allow": async ({
		model,
	}: Context) => {
		for (const [index, user] of model.users.entries()) {
			const held = heldBy(model, user);
			const statuses = Object.fromEntries(
				await Promise.all(
					PERMISSIONS.map(async (permission) => {
						const response = await user.session.request({
							path: PROBES[permission],
						});
						return [permission, response.status] as const;
					}),
				),
			);
			const expected = Object.fromEntries(
				PERMISSIONS.map((permission) => [
					permission,
					held.has(permission) ? 200 : 403,
				]),
			);
			expect(statuses, `user ${index}`).toEqual(expected);
		}
	},
};

describe("access model", () => {
	requires("harness:outbox");

	simulation("users can do exactly what their roles hold, after any change", {
		model: (): Model => ({ roles: new Map(), users: [] }),
		actions: [
			createRoleAction,
			updateRole,
			deleteRole,
			inviteUser,
			setUserRoles,
		],
		invariants,
	});
});
