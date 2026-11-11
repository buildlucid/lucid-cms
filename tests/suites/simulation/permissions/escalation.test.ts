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
import { uniqueName } from "#shared/permissions";

/** Permissions managers may hold some of, and try to hand out. */
const CONTENT = [
	"documents:story:read",
	"documents:story:update",
	"documents:page:read",
	"email:read",
	"settings:update",
] as const;

/** Permissions that let someone manage roles and users. Managers hold a random share of them. */
const MANAGING = [
	"roles:create",
	"roles:update",
	"roles:delete",
	"users:update",
	"users:read",
] as const;

type Permission = (typeof CONTENT)[number] | (typeof MANAGING)[number];

const MAX_MANAGERS = 3;

type User = { id: number; session: Session; roles: Set<number> };

type Model = {
	roles: Map<number, Set<Permission>>;
	users: User[];
};

type Context = SimulationContext<Model>;

const contentPermissions = fc.subarray([...CONTENT]);
const managingPermissions = fc.subarray([...MANAGING]);
/** Indexes into whatever exists when the action runs, so sequences still shrink. */
const index = fc.nat();
const indexes = fc.uniqueArray(fc.nat(), { maxLength: 3 });

const at = <Item>(items: Item[], choice: number): Item => {
	const item = items[choice % items.length];
	if (item === undefined) {
		throw new Error(
			"Nothing to pick from. The action's `when` should rule this out.",
		);
	}
	return item;
};

/** What a user holds now: everything any of their roles holds. */
const heldBy = (model: Model, user: User) =>
	new Set(
		[...user.roles].flatMap((roleId) => [...(model.roles.get(roleId) ?? [])]),
	);

const holdsAll = (held: Set<Permission>, permissions: Iterable<Permission>) =>
	[...permissions].every((permission) => held.has(permission));

const hasUsersAndRoles = (model: Model) =>
	model.users.length > 0 && model.roles.size > 0;

const permissionsOf = (model: Model, roleIds: Iterable<number>) =>
	[...roleIds].flatMap((roleId) => [...(model.roles.get(roleId) ?? [])]);

const addManager = action<
	Model,
	{ managing: Permission[]; content: Permission[] }
>({
	name: "addManager",
	input: fc.record({
		managing: managingPermissions,
		content: contentPermissions,
	}),
	when: (model) => model.users.length < MAX_MANAGERS,
	run: async ({ lucid, model, input }) => {
		const permissions = [...input.managing, ...input.content];
		const { id, session, roleId } = await lucid.user({ permissions });
		if (roleId === null) {
			throw new Error("The manager was made without a role.");
		}
		model.roles.set(roleId, new Set(permissions));
		model.users.push({ id, session, roles: new Set([roleId]) });
	},
});

const managerCreatesRole = action<
	Model,
	{ manager: number; permissions: Permission[] }
>({
	name: "managerCreatesRole",
	input: fc.record({ manager: index, permissions: contentPermissions }),
	when: (model) => model.users.length > 0,
	run: async ({ model, input }) => {
		const manager = at(model.users, input.manager);
		const held = heldBy(model, manager);
		const created = await manager.session.request<{ data: { id: number } }>({
			method: "POST",
			path: "/api/v1/roles",
			body: { name: uniqueName("Role"), permissions: input.permissions },
		});

		const allowed =
			held.has("roles:create") && holdsAll(held, input.permissions);
		expect(created.status).toBe(allowed ? 201 : 403);
		if (allowed) {
			model.roles.set(created.body.data.id, new Set(input.permissions));
		}
		return created.status;
	},
});

const managerUpdatesRole = action<
	Model,
	{ manager: number; role: number; permissions: Permission[] }
>({
	name: "managerUpdatesRole",
	input: fc.record({
		manager: index,
		role: index,
		permissions: contentPermissions,
	}),
	when: hasUsersAndRoles,
	run: async ({ model, input }) => {
		const manager = at(model.users, input.manager);
		const roleId = at([...model.roles.keys()], input.role);
		const held = heldBy(model, manager);
		const current = model.roles.get(roleId) ?? new Set();
		const updated = await manager.session.request({
			method: "PATCH",
			path: `/api/v1/roles/${roleId}`,
			body: { permissions: input.permissions },
		});

		//* both what the role holds and what it would hold must be the manager's to give
		const allowed =
			held.has("roles:update") &&
			holdsAll(held, current) &&
			holdsAll(held, input.permissions);
		expect(updated.status).toBe(allowed ? 204 : 403);
		if (allowed) {
			model.roles.set(roleId, new Set(input.permissions));
		}
		return updated.status;
	},
});

const managerDeletesRole = action<Model, { manager: number; role: number }>({
	name: "managerDeletesRole",
	input: fc.record({ manager: index, role: index }),
	when: hasUsersAndRoles,
	run: async ({ model, input }) => {
		const manager = at(model.users, input.manager);
		const roleId = at([...model.roles.keys()], input.role);
		const held = heldBy(model, manager);
		const deleted = await manager.session.request({
			method: "DELETE",
			path: `/api/v1/roles/${roleId}`,
		});

		const allowed =
			held.has("roles:delete") && holdsAll(held, model.roles.get(roleId) ?? []);
		expect(deleted.status).toBe(allowed ? 204 : 403);
		if (allowed) {
			model.roles.delete(roleId);
			for (const user of model.users) {
				user.roles.delete(roleId);
			}
		}
		return deleted.status;
	},
});

const managerSetsRoles = action<
	Model,
	{ manager: number; target: number; roles: number[] }
>({
	name: "managerSetsRoles",
	input: fc.record({ manager: index, target: index, roles: indexes }),
	when: (model) => model.users.length > 1 && model.roles.size > 0,
	run: async ({ model, input }) => {
		const manager = at(model.users, input.manager);
		const others = model.users.filter((user) => user !== manager);
		const target = at(others, input.target);
		const roleIds = [
			...new Set(
				input.roles.map((choice) => at([...model.roles.keys()], choice)),
			),
		];
		const held = heldBy(model, manager);
		const updated = await manager.session.request({
			method: "PATCH",
			path: `/api/v1/users/${target.id}`,
			body: { roleIds },
		});

		//* only the roles given or taken away are checked, so others can stay on the user
		const changed = [
			...roleIds.filter((roleId) => !target.roles.has(roleId)),
			...[...target.roles].filter((roleId) => !roleIds.includes(roleId)),
		];
		const allowed =
			held.has("users:update") && holdsAll(held, permissionsOf(model, changed));
		expect(updated.status).toBe(allowed ? 204 : 403);
		if (allowed) {
			target.roles = new Set(roleIds);
		}
		return updated.status;
	},
});

const invariants = {
	"every role holds what the model says, so nothing was given behind a refusal":
		async ({ admin, model }: Context) => {
			for (const [roleId, expected] of model.roles) {
				const role = await admin.request<{
					data: { permissions?: Array<{ permission: string }> };
				}>({ path: `/api/v1/roles/${roleId}` });
				expect(role.status, `role ${roleId}`).toBe(200);
				expect(
					(role.body.data.permissions ?? [])
						.map((item) => item.permission)
						.toSorted(),
					`role ${roleId}`,
				).toEqual([...expected].toSorted());
			}
		},
	"every user has the roles the model says": async ({
		admin,
		model,
	}: Context) => {
		for (const user of model.users) {
			const read = await admin.request<{
				data: { superAdmin: boolean; roles?: Array<{ id: number }> };
			}>({ path: `/api/v1/users/${user.id}` });
			expect(read.body.data.superAdmin, `user ${user.id}`).toBe(false);
			expect(
				(read.body.data.roles ?? []).map((role) => role.id).toSorted(),
				`user ${user.id}`,
			).toEqual([...user.roles].toSorted());
		}
	},
};

describe("no escalation", () => {
	requires("harness:outbox");

	simulation("managers can only hand out permissions they hold", {
		model: (): Model => ({ roles: new Map(), users: [] }),
		actions: [
			addManager,
			managerCreatesRole,
			managerUpdatesRole,
			managerDeletesRole,
			managerSetsRoles,
		],
		invariants,
	});
});
