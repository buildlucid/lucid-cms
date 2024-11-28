import { createStore } from "solid-js/store";
import type { UserResponse, Permission } from "@types";

type UserStoreT = {
	user: UserResponse | null;
	reset: () => void;

	hasPermission: (_perm: Permission[]) => {
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
	hasPermission(perm: Permission[]) {
		if (this.user?.superAdmin) return { all: true, some: true };

		const userPerms = this.user?.permissions;
		if (!userPerms) return { all: false, some: false };

		const all = perm.every((p) => userPerms.includes(p));
		const some = perm.some((p) => userPerms.includes(p));

		return { all, some };
	},
});

const userStore = {
	get,
	set,
};

export default userStore;
