import { type Component, createMemo, Match, Switch } from "solid-js";
import { Select } from "@/components/Groups/Form/Select";
import tenantStore from "@/store/tenantStore";
import { translateAdminCopy } from "@/translations";

const TenantSelect: Component = () => {
	// ----------------------------------
	// Memos
	const tenant = createMemo(() => tenantStore.get.tenant);
	const tenants = createMemo(() => tenantStore.get.tenants);
	const hasMultipleTenants = createMemo(() => tenants().length > 1);
	const options = createMemo(() => {
		return tenants().map((t) => ({
			value: t.key,
			label: `${translateAdminCopy(t.name)} (${t.key})`,
		}));
	});

	// ----------------------------------------
	// Render
	return (
		<Switch>
			<Match when={hasMultipleTenants()}>
				<Select
					id={"tenant"}
					value={tenant()}
					onChange={(value) => {
						if (!value) tenantStore.get.setTenant(undefined);
						else tenantStore.get.setTenant(value.toString());
					}}
					name={"tenant"}
					options={options()}
					noMargin={true}
					noClear={true}
					small={true}
				/>
			</Match>
		</Switch>
	);
};

export default TenantSelect;
