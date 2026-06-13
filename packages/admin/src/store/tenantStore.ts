import type { Tenant } from "@types";
import { createStore } from "solid-js/store";

type TenantStoreT = {
	tenant: string | undefined;
	tenants: Tenant[];
	syncTenants: (_tenants: Tenant[]) => void;
	setTenant: (_tenant?: string) => void;
};

const TENANT_KEY = "lucid_tenant";

const getInitialTenant = () => {
	const tenant = localStorage.getItem(TENANT_KEY);
	if (tenant) {
		return tenant;
	}
	return undefined;
};

const [get, set] = createStore<TenantStoreT>({
	tenant: getInitialTenant(),
	tenants: [],

	syncTenants(tenants: Tenant[]) {
		set("tenants", tenants);

		if (tenants.length === 0) {
			localStorage.removeItem(TENANT_KEY);
			set("tenant", undefined);
			return;
		}

		const persistedTenant = localStorage.getItem(TENANT_KEY);
		if (persistedTenant) {
			const tenantExists = tenants.find((t) => t.key === persistedTenant);
			if (tenantExists !== undefined) {
				set("tenant", persistedTenant);
				return;
			}
		}

		const nextTenant = tenants[0]?.key;
		if (nextTenant === undefined) {
			localStorage.removeItem(TENANT_KEY);
			set("tenant", undefined);
			return;
		}

		localStorage.setItem(TENANT_KEY, nextTenant);
		set("tenant", nextTenant);
	},
	setTenant(tenant?: string) {
		if (tenant === undefined) localStorage.removeItem(TENANT_KEY);
		else localStorage.setItem(TENANT_KEY, tenant);
		set("tenant", tenant);
	},
});

const tenantStore = {
	get,
	set,
};

export default tenantStore;
