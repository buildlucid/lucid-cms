import { type Component, createSignal } from "solid-js";
import { IntegrationsList } from "@/components/IntegrationsList/IntegrationsList";
import { PageLayout } from "@/components/PageLayout/PageLayout";
import SystemSettingsHeader from "@/components/SystemSettingsHeader/SystemSettingsHeader";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState/useQueryState";

const SystemIntegrationsPage: Component = () => {
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
		singleSort: true,
	});
	const [openCreateIntegrationPanel, setOpenCreateIntegrationPanel] =
		createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<PageLayout
			slots={{
				header: <SystemSettingsHeader />,
			}}
		>
			<IntegrationsList
				state={{
					searchParams,
					openCreateIntegrationPanel: openCreateIntegrationPanel,
					setOpenCreateIntegrationPanel: setOpenCreateIntegrationPanel,
				}}
			/>
		</PageLayout>
	);
};

export default SystemIntegrationsPage;
