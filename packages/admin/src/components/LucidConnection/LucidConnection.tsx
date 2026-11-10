import { TbOutlineRefresh } from "solid-icons/tb";
import {
	type Component,
	createMemo,
	createSignal,
	onMount,
	Show,
} from "solid-js";
import ActionMenu from "@/components/ActionMenu/ActionMenu";
import Button from "@/components/Button/Button";
import DateText from "@/components/DateText/DateText";
import DetailsList from "@/components/DetailsList/DetailsList";
import DisconnectConnectionModal from "@/components/DisconnectConnectionModal/DisconnectConnectionModal";
import InfoRow from "@/components/InfoRow/InfoRow";
import QueryBoundary from "@/components/QueryBoundary/QueryBoundary";
import ResetConnectionModal from "@/components/ResetConnectionModal/ResetConnectionModal";
import RowIcon from "@/components/RowIcon/RowIcon";
import StateNote from "@/components/StateNote/StateNote";
import StatusIndicator from "@/components/StatusIndicator/StatusIndicator";
import ThemeLogoIcon from "@/components/ThemeLogoIcon/ThemeLogoIcon";
import constants from "@/constants";
import { Permissions } from "@/constants/permissions";
import api from "@/services/api";
import userStore from "@/store/userStore/userStore";
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
	const [resetOpen, setResetOpen] = createSignal(false);

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
	const isRevoked = createMemo(() => connection()?.status === "revoked");
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
			<QueryBoundary
				loading={status.isLoading}
				error={status.isLoadingError}
				appearance="card"
				onRetry={() => status.refetch()}
				loadingFallback={<span class="skeleton block h-40 w-full" />}
			>
				<InfoRow.Content padding="none">
					<div class="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between">
						<div class="flex min-w-0 items-center gap-4">
							<RowIcon>
								<ThemeLogoIcon class="size-4.5" alt="" />
							</RowIcon>
							<div class="min-w-0">
								<h3 class="flex items-center gap-2 text-sm font-medium">
									<StatusIndicator
										variant={
											isConnected()
												? "success"
												: isRevoked()
													? "danger"
													: "neutral-subtle"
										}
									/>
									{isConnected()
										? T()("connection.connected.title")
										: isRevoked()
											? T()("connection.revoked.title")
											: T()("connection.disconnected.title")}
								</h3>
								<p class="mt-0.5 text-sm">
									{isConnected()
										? T()("connection.connected.description")
										: isRevoked()
											? T()("connection.revoked.description")
											: T()("connection.disconnected.description")}
								</p>
							</div>
						</div>
						<div class="flex shrink-0 items-center gap-1.5">
							<Show
								when={isConnected()}
								fallback={
									<Button
										type="button"
										size="sm"
										variant="primary"
										permission={Permissions.ConnectionUpdate}
										loading={connect.action.isPending}
										onClick={() => connect.action.mutate({})}
									>
										{T()("connection.connect.action")}
									</Button>
								}
							>
								<Button
									type="button"
									size="sm"
									variant="ghost"
									shape="square"
									tooltip={T()("connection.verify.action")}
									aria-label={T()("connection.verify.action")}
									permission={Permissions.ConnectionUpdate}
									loading={verify.action.isPending}
									onClick={() => verify.action.mutate({})}
								>
									<TbOutlineRefresh class="size-4" />
								</Button>
							</Show>
							<ActionMenu
								size="md"
								actions={[
									{
										type: "link",
										label: T()("connection.remote.visit.action"),
										icon: "link",
										href: constants.lucidRemote.website,
										target: "_blank",
										rel: "noreferrer",
										sortOrder: 0,
									},
									{
										type: "button",
										label: T()("connection.reconnect.action"),
										icon: "link",
										onClick: () => connect.action.mutate({}),
										permission: canManage() && isConnected(),
										loading: connect.action.isPending,
										sortOrder: 30,
									},
									{
										type: "button",
										label: T()("connection.disconnect.action"),
										icon: "ban",
										onClick: () => setDisconnectOpen(true),
										permission: canManage() && isConnected(),
										sortOrder: 70,
										variant: "danger",
									},
									{
										type: "button",
										label: T()("connection.reset.action"),
										icon: "rotate",
										onClick: () => setResetOpen(true),
										permission: canManage(),
										sortOrder: 80,
										variant: "danger",
									},
								]}
							/>
						</div>
					</div>
					<Show when={connection()?.errorKey}>
						<div class="px-5 pb-5">
							<StateNote variant="danger">
								{errorMessage(connection()?.errorKey)}
							</StateNote>
						</div>
					</Show>
					<Show when={lastVerifiedIso()}>
						{(verified) => (
							<div class="border-t border-border px-5 py-4">
								<DetailsList
									layout="columns"
									variant="plain"
									items={[
										{
											label: T()("connection.organisation.label"),
											value:
												connection()?.organisation?.name ??
												T()("common.not.set"),
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
											value: (
												<DateText
													date={verified()}
													includeTime={true}
													class="text-sm!"
												/>
											),
										},
									]}
								/>
							</div>
						)}
					</Show>
				</InfoRow.Content>
			</QueryBoundary>
			<ResetConnectionModal
				state={{ open: resetOpen(), setOpen: setResetOpen }}
			/>
			<DisconnectConnectionModal
				state={{ open: disconnectOpen(), setOpen: setDisconnectOpen }}
			/>
		</>
	);
};

export default LucidConnection;
