import { FaSolidArrowsRotate } from "solid-icons/fa";
import {
	type Component,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import InfoRow from "@/components/Blocks/InfoRow";
import { DynamicContent } from "@/components/Groups/Layout";
import DisconnectConnection from "@/components/Modals/Connection/DisconnectConnection";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import DetailsList from "@/components/Partials/DetailsList";
import Pill from "@/components/Partials/Pill";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

const errorMessage = (key: string | null | undefined) => {
	switch (key) {
		case "connection_not_configured":
			return T()("connection.errors.not.configured");
		case "connection_not_connected":
			return T()("connection.errors.not.connected");
		case "connection_unreachable":
		case "disconnect_failed":
			return T()("connection.errors.unreachable");
		case "connection_refresh_failed":
			return T()("connection.errors.refresh.failed");
		case "connection_revoked":
			return T()("connection.errors.revoked");
		case "oauth_metadata_invalid":
		case "protected_resource_invalid":
			return T()("connection.errors.metadata.invalid");
		case "client_registration_failed":
			return T()("connection.errors.registration.failed");
		case "callback_state_invalid":
			return T()("connection.errors.state.invalid");
		case "callback_browser_invalid":
			return T()("connection.errors.browser.invalid");
		case "callback_issuer_invalid":
			return T()("connection.errors.issuer.invalid");
		case "callback_expired":
			return T()("connection.errors.expired");
		case "authorization_denied":
			return T()("connection.errors.denied");
		case "authorization_failed":
		case "token_exchange_failed":
		case "connection_remote_failed":
			return T()("connection.errors.authorization.failed");
		default:
			return T()("connection.errors.unknown");
	}
};

const LucidConnection: Component = () => {
	// ----------------------------------------
	// State & Hooks
	const [disconnectOpen, setDisconnectOpen] = createSignal(false);

	// ----------------------------------------
	// Queries
	const status = api.connection.useGetStatus({ queryParams: {} });

	// ----------------------------------------
	// Mutations
	const connect = api.connection.useConnect();
	const verify = api.connection.useVerify();

	// ----------------------------------------
	// Memos
	const connection = createMemo(() => status.data?.data);
	const canManage = createMemo(
		() => userStore.get.hasPermission([Permissions.ConnectionUpdate]).all,
	);
	const isConnected = createMemo(() => connection()?.status === "connected");
	const lastVerifiedIso = createMemo(() => {
		const timestamp = connection()?.lastVerified;
		return timestamp ? new Date(timestamp * 1000).toISOString() : null;
	});

	// ----------------------------------------
	// Effects
	onMount(() => {
		const url = new URL(window.location.href);
		const result = url.searchParams.get("result");
		if (!result) return;

		if (result === "connected") {
			spawnToast({
				title: T()("toasts.connection.connected.title"),
				message: T()("toasts.connection.connected.message"),
				status: "success",
			});
		} else {
			spawnToast({
				title: T()("toasts.connection.failed.title"),
				message: errorMessage(url.searchParams.get("error")),
				status: result === "denied" ? "warning" : "error",
			});
		}

		window.history.replaceState(
			window.history.state,
			"",
			`${url.pathname}${url.hash}`,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<>
			<DynamicContent
				state={{
					isError: status.isError,
					isLoading: status.isLoading,
					isSuccess: status.isSuccess,
				}}
				options={{ inline: true }}
			>
				<InfoRow.Content
					title={
						isConnected()
							? T()("connection.connected.title")
							: connection()?.status === "revoked"
								? T()("connection.revoked.title")
								: T()("connection.disconnected.title")
					}
					description={
						isConnected()
							? T()("connection.connected.description")
							: connection()?.status === "revoked"
								? T()("connection.revoked.description")
								: T()("connection.disconnected.description")
					}
					actions={
						<div class="flex flex-wrap gap-2">
							<Show when={isConnected()}>
								<Button
									type="button"
									size="medium"
									theme="border-outline"
									permission={canManage()}
									loading={verify.action.isPending}
									onClick={() => verify.action.mutate({})}
								>
									<FaSolidArrowsRotate size={12} class="mr-2" />
									{T()("connection.verify.action")}
								</Button>
								<Button
									type="button"
									size="medium"
									theme="border-outline"
									permission={canManage()}
									loading={connect.action.isPending}
									onClick={() => connect.action.mutate({})}
								>
									{T()("connection.reconnect.action")}
								</Button>
								<Button
									type="button"
									size="medium"
									theme="danger-outline"
									permission={canManage()}
									onClick={() => setDisconnectOpen(true)}
								>
									{T()("connection.disconnect.action")}
								</Button>
							</Show>
							<Show when={!isConnected()}>
								<Button
									type="button"
									size="medium"
									theme="primary"
									permission={canManage()}
									loading={connect.action.isPending}
									onClick={() => connect.action.mutate({})}
								>
									{connection()?.status === "revoked"
										? T()("connection.reconnect.action")
										: T()("connection.connect.action")}
								</Button>
							</Show>
						</div>
					}
					reducedMargin={true}
				>
					<DetailsList
						type="text"
						theme="contained"
						items={[
							{
								label: T()("connection.status.label"),
								value: (
									<Pill
										theme={
											isConnected()
												? "primary-opaque"
												: connection()?.status === "revoked"
													? "error-opaque"
													: "outline"
										}
									>
										{isConnected()
											? T()("connection.status.connected")
											: connection()?.status === "revoked"
												? T()("connection.status.revoked")
												: T()("connection.status.disconnected")}
									</Pill>
								),
							},
							{
								label: T()("connection.organisation.label"),
								value:
									connection()?.organisation?.name ?? T()("common.not.set"),
								show: isConnected(),
							},
							{
								label: T()("connection.name.label"),
								value:
									connection()?.connection?.name ??
									connection()?.connection?.clientName ??
									T()("common.not.set"),
								show: isConnected(),
							},
							{
								label: T()("connection.last.verified.label"),
								value: lastVerifiedIso() ? (
									<DateText date={lastVerifiedIso()} includeTime={true} />
								) : (
									T()("common.not.checked")
								),
							},
							{
								label: T()("common.message"),
								value: errorMessage(connection()?.errorKey),
								show:
									connection()?.errorKey !== null &&
									connection()?.errorKey !== undefined,
								stacked: true,
							},
						]}
					/>
				</InfoRow.Content>
			</DynamicContent>
			<DisconnectConnection
				state={{ open: disconnectOpen(), setOpen: setDisconnectOpen }}
			/>
		</>
	);
};

export default LucidConnection;
