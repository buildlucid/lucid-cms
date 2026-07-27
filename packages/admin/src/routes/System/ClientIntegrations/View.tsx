import { type Component, createMemo, createSignal } from "solid-js";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { ClientIntegrationsList } from "@/components/Groups/Content";
import { Wrapper } from "@/components/Groups/Layout";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemClientIntegrationsRoute: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const searchParams = useQueryState({
		mode: "url",
		schema: {
			filters: {
				key: textFilter(),
				name: textFilter(),
				description: textFilter(),
				enabled: booleanFilter(),
				scope: textFilter(),
				lastUsedAt: textFilter(),
				lastUsedIp: textFilter(),
				createdAt: textFilter(),
				updatedAt: textFilter(),
			},
			sorts: {
				name: sort(),
				description: sort(),
				enabled: sort(),
				createdAt: sort(),
			},
		},
		options: {
			singleSort: true,
		},
	});
	const [
		openCreateClientIntegrationPanel,
		setOpenCreateClientIntegrationPanel,
	] = createSignal(false);

	// ----------------------------------------
	// Memos
	const canReadClientIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const hasCreatePermission = createMemo(() => {
		return (
			canReadClientIntegrations() &&
			userStore.get.hasPermission([Permissions.IntegrationsCreate]).all
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Wrapper
			slots={{
				header: (
					<SystemSettingsHeader
						actions={{
							create: [
								{
									open: openCreateClientIntegrationPanel(),
									setOpen: setOpenCreateClientIntegrationPanel,
									permission: hasCreatePermission(),
									label: T()("client.integrations.create.action"),
								},
							],
						}}
					/>
				),
			}}
		>
			<ClientIntegrationsList
				state={{
					searchParams,
					openCreateClientIntegrationPanel: openCreateClientIntegrationPanel,
					setOpenCreateClientIntegrationPanel:
						setOpenCreateClientIntegrationPanel,
				}}
			/>
		</Wrapper>
	);
};

export default SystemClientIntegrationsRoute;
