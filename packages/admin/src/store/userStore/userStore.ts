import type { Permission, User } from "@types";
import { createStore } from "solid-js/store";

type UserStoreT = {
	user: User | null;
	reset: () => void;

	hasPermission: (_perm: Array<Permission | undefined>) => {
		all: boolean;
		some: boolean;
	};
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
});

const userStore = {
	get,
	set,
};

export default userStore;
