import { type Component, createSignal } from "solid-js";
import SystemSettingsHeader from "@/components/Blocks/SystemSettingsHeader";
import { IntegrationsList } from "@/components/Groups/Content";
import { Wrapper } from "@/components/Groups/Layout";
import useQueryState, {
	booleanFilter,
	sort,
	textFilter,
} from "@/hooks/useQueryState";

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
	// Render
	return (
		<Wrapper
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
		</Wrapper>
	);
};

export default SystemIntegrationsRoute;
