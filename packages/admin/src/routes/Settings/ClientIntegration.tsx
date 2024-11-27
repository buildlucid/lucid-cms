import T from "@/translations";
import {
	type Component,
	createMemo,
	createSignal,
	For,
	Match,
	Switch,
} from "solid-js";
import useRowTarget from "@/hooks/useRowTarget";
import api from "@/services/api";
import userStore from "@/store/userStore";
import UpsertClientIntegrationPanel from "@/components/Panels/ClientIntegrations/UpsertClientIntegrationPanel";
import InfoRow from "@/components/Blocks/InfoRow";
import Layout from "@/components/Groups/Layout";
import DeleteClientIntegration from "@/components/Modals/ClientIntegrations/DeleteClientIntegration";
import CopyAPIKey from "@/components/Modals/ClientIntegrations/CopyAPIKey";
import RegenerateAPIKey from "@/components/Modals/ClientIntegrations/RegenerateAPIKey";
import Button from "@/components/Partials/Button";
import ErrorBlock from "@/components/Partials/ErrorBlock";
import ClientIntegrationRow from "@/components/Rows/ClientIntegrationRow";
import Headers from "@/components/Groups/Headers";

const GeneralSettingsRoute: Component = (props) => {
	// ----------------------------------------
	// State / Hooks
	const rowTarget = useRowTarget({
		triggers: {
			delete: false,
			regenerateAPIKey: false,
			apiKey: false,
			update: false,
		},
	});
	const [getAPIKey, setAPIKey] = createSignal<string | undefined>();

	// ----------------------------------
	// Queries
	const clientIntegrations = api.clientIntegrations.useGetAll({
		queryParams: {},
	});

	// ----------------------------------------
	// Memos
	const isLoading = createMemo(() => clientIntegrations.isLoading);
	const isError = createMemo(() => clientIntegrations.isError);
	const isSuccess = createMemo(() => clientIntegrations.isSuccess);

	const hasCreatePermission = createMemo(() => {
		return userStore.get.hasPermission(["create_client_integration"]).all;
	});

	// ----------------------------------------
	// Render
	return (
		<Layout.Wrapper
			slots={{
				header: (
					<Headers.Standard
						copy={{
							title: T()("settings_route_title"),
							description: T()("settings_route_description"),
						}}
						actions={{
							create: {
								open: rowTarget.getTriggers().update,
								setOpen: (state) => {
									rowTarget.setTargetId(undefined);
									rowTarget.setTrigger("update", state);
								},
								permission: hasCreatePermission(),
							},
						}}
						slots={{
							bottom: (
								<Layout.NavigationTabs
									tabs={[
										{
											label: T()("general"),
											href: "/admin/settings",
										},
										{
											label: T()("client_integrations"),
											href: "/admin/settings/client-integrations",
										},
									]}
								/>
							),
						}}
					/>
				),
			}}
		>
			<Layout.DynamicContent
				state={{
					isError: clientIntegrations.isError,
					isSuccess: clientIntegrations.isSuccess,
					isLoading: clientIntegrations.isLoading,
				}}
				options={{
					padding: "30",
				}}
			>
				<InfoRow.Root
					title={T()("client_integrations")}
					description={T()("client_integration_description")}
				>
					<Switch>
						<Match
							when={
								clientIntegrations.data?.data &&
								clientIntegrations.data?.data.length > 0
							}
						>
							<For each={clientIntegrations.data?.data}>
								{(clientIntegration) => (
									<ClientIntegrationRow
										clientIntegration={clientIntegration}
										rowTarget={rowTarget}
									/>
								)}
							</For>
						</Match>
						<Match when={clientIntegrations.data?.data.length === 0}>
							<InfoRow.Content>
								<ErrorBlock
									content={{
										title: T()("no_client_integrations_found_title"),
										description: T()(
											"no_client_integrations_found_descriptions",
										),
									}}
									options={{
										contentMaxWidth: "md",
									}}
								>
									<Button
										type="submit"
										theme="primary"
										size="medium"
										onClick={() => {
											rowTarget.setTargetId(undefined);
											rowTarget.setTrigger("update", true);
										}}
									>
										{T()("create_integration")}
									</Button>
								</ErrorBlock>
							</InfoRow.Content>
						</Match>
					</Switch>
				</InfoRow.Root>
			</Layout.DynamicContent>

			{/* Panels & Modals */}
			<DeleteClientIntegration
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().delete,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("delete", state);
					},
				}}
			/>
			<UpsertClientIntegrationPanel
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().update,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("update", state);
					},
				}}
				callbacks={{
					onCreateSuccess: (key) => {
						setAPIKey(key);
						rowTarget.setTrigger("apiKey", true);
					},
				}}
			/>
			<CopyAPIKey
				apiKey={getAPIKey()}
				state={{
					open: rowTarget.getTriggers().apiKey,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("apiKey", state);
					},
				}}
				callbacks={{
					onClose: () => {
						setAPIKey(undefined);
					},
				}}
			/>
			<RegenerateAPIKey
				id={rowTarget.getTargetId}
				state={{
					open: rowTarget.getTriggers().regenerateAPIKey,
					setOpen: (state: boolean) => {
						rowTarget.setTrigger("regenerateAPIKey", state);
					},
				}}
				callbacks={{
					onSuccess: (key) => {
						setAPIKey(key);
						rowTarget.setTrigger("apiKey", true);
					},
				}}
			/>
		</Layout.Wrapper>
	);
};

export default GeneralSettingsRoute;
