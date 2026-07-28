import { type Component, createMemo, createSignal } from "solid-js";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { IntegrationsList } from "@/components/Groups/Content";
import { Wrapper } from "@/components/Groups/Layout";
import { Permissions } from "@/constants/permissions";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";
import userStore from "@/store/userStore";
import T from "@/translations";

const SystemIntegrationsRoute: Component = () => {
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
				expiresAt: textFilter(),
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
	const [openCreateIntegrationPanel, setOpenCreateIntegrationPanel] =
		createSignal(false);

	// ----------------------------------------
	// Memos
	const canReadIntegrations = createMemo(
		() => userStore.get.hasPermission([Permissions.IntegrationsRead]).all,
	);
	const hasCreatePermission = createMemo(() => {
		return (
			canReadIntegrations() &&
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
									open: openCreateIntegrationPanel(),
									setOpen: setOpenCreateIntegrationPanel,
									permission: hasCreatePermission(),
									label: T()("integrations.create.action"),
								},
							],
						}}
					/>
				),
			}}
		>
			<IntegrationsList
				state={{
					searchParams,
					openCreateIntegrationPanel: openCreateIntegrationPanel,
					setOpenCreateIntegrationPanel: setOpenCreateIntegrationPanel,
				}}
			/>
		</Wrapper>
	);
};

export default SystemIntegrationsRoute;
