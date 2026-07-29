import { FaSolidArrowUpRightFromSquare } from "solid-icons/fa";
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
import ActionDropdown from "@/components/Partials/ActionDropdown";
import Button from "@/components/Partials/Button";
import DateText from "@/components/Partials/DateText";
import Link from "@/components/Partials/Link";
import Pill from "@/components/Partials/Pill";
import constants from "@/constants";
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
				<InfoRow.Content reducedMargin={true}>
					<div class="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
						<div class="min-w-0">
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
							<p class="mt-2 text-sm">
								{isConnected()
									? T()("connection.connected.description")
									: connection()?.status === "revoked"
										? T()("connection.revoked.description")
										: T()("connection.disconnected.description")}
							</p>
						</div>
						<div class="flex shrink-0 items-center gap-2">
							<Link
								href={constants.lucidRemote.website}
								target="_blank"
								rel="noreferrer"
								theme="border-outline"
								size="small"
							>
								{T()("connection.remote.visit.action")}
								<FaSolidArrowUpRightFromSquare class="ml-1.5 size-2.5" />
							</Link>
							<Show when={isConnected()}>
								<ActionDropdown
									actions={[
										{
											type: "button",
											label: T()("connection.verify.action"),
											icon: "rotate",
											onClick: () => verify.action.mutate({}),
											permission: canManage(),
											isLoading: verify.action.isPending,
										},
										{
											type: "button",
											label: T()("connection.reconnect.action"),
											icon: "link",
											onClick: () => connect.action.mutate({}),
											permission: canManage(),
											isLoading: connect.action.isPending,
										},
										{
											type: "button",
											label: T()("connection.disconnect.action"),
											icon: "ban",
											onClick: () => setDisconnectOpen(true),
											permission: canManage(),
										},
									]}
									options={{ raised: true }}
								/>
							</Show>
							<Show when={!isConnected()}>
								<Button
									type="button"
									size="small"
									theme="primary"
									permission={canManage()}
									loading={connect.action.isPending}
									onClick={() => connect.action.mutate({})}
								>
									{T()("connection.connect.action")}
								</Button>
							</Show>
						</div>
					</div>
					<Show when={connection()?.errorKey}>
						<div class="mt-4 border-t border-border pt-3">
							<p class="text-xs text-error-base">
								{errorMessage(connection()?.errorKey)}
							</p>
						</div>
					</Show>
				</InfoRow.Content>
				<Show when={lastVerifiedIso()}>
					{(verified) => (
						<InfoRow.Content reducedMargin={true}>
							<dl class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
								<Show when={isConnected()}>
									<div class="min-w-0">
										<dt class="mb-1 text-xs font-medium text-body">
											{T()("connection.organisation.label")}
										</dt>
										<dd class="truncate text-sm font-medium text-subtitle">
											{connection()?.organisation?.name ??
												T()("common.not.set")}
										</dd>
									</div>
									<div class="min-w-0">
										<dt class="mb-1 text-xs font-medium text-body">
											{T()("connection.name.label")}
										</dt>
										<dd class="truncate text-sm font-medium text-subtitle">
											{connection()?.connection?.name ??
												connection()?.connection?.clientName ??
												T()("common.not.set")}
										</dd>
									</div>
								</Show>
								<div class="min-w-0">
									<dt class="mb-1 text-xs font-medium text-body">
										{T()("connection.last.verified.label")}
									</dt>
									<dd class="text-sm font-medium text-subtitle">
										<DateText
											date={verified()}
											includeTime={true}
											class="text-sm!"
										/>
									</dd>
								</div>
							</dl>
						</InfoRow.Content>
					)}
				</Show>
			</DynamicContent>
			<DisconnectConnection
				state={{ open: disconnectOpen(), setOpen: setDisconnectOpen }}
			/>
		</>
	);
};

export default LucidConnection;
