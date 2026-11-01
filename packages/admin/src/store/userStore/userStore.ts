import { matchPermissions } from "@match-permissions";
import type { Permission, PermissionRequirement, User } from "@types";
import { createStore } from "solid-js/store";

type UserStoreT = {
	user: User | null;
	reset: () => void;

	hasPermission: (_perm: Array<Permission | undefined>) => {
		all: boolean;
		some: boolean;
	};
	meetsRequirement: (_requirement: PermissionRequirement) => boolean;
	canGrant: (_permissions: readonly string[]) => boolean;
};

const [get, set] = createStore<UserStoreT>({
	user: null,
	reset() {
		set("user", null);
	},

	// -----------------
	// Permissions
	hasPermission(perm: Array<Permission | undefined>) {
		const filteredPerm = perm.filter((p) => p !== undefined);
		if (filteredPerm.length === 0) return { all: false, some: false };

		if (this.user?.superAdmin) return { all: true, some: true };

		const userPerms = this.user?.permissions;
		if (!userPerms) return { all: false, some: false };

		const all = filteredPerm.every((p) => userPerms.includes(p));
		const some = filteredPerm.some((p) => userPerms.includes(p));

		return { all, some };
	},
	meetsRequirement(requirement) {
		if (this.user?.superAdmin) return true;
		return matchPermissions(this.user?.permissions ?? [], requirement);
	},
	/** Checks whether the user holds every permission. */
	canGrant(permissions) {
		if (this.user?.superAdmin) return true;
		const userPerms = this.user?.permissions ?? [];
		return permissions.every((permission) =>
			userPerms.some((held) => held === permission),
		);
	},
});

const userStore = {
	get,
	set,
};

export default userStore;
