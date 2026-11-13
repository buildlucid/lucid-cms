import {
	Button,
	DateText,
	MaintenanceTile,
	Modal,
	Skeleton,
} from "@lucidcms/admin/components";
import {
	Permissions,
	usePermissions,
	useTranslation,
} from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { SlotComponent } from "@lucidcms/admin/types";
import { toast } from "@lucidcms/admin/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/solid-query";
import { createSignal, Match, Show, Switch } from "solid-js";
import { indexNow } from "../../../constants.js";
import parseIndexNowStatus from "../../utils/parse-index-now-status.js";
import type sendIndexNowConfig from "./config.js";

const statusQueryKey = ["seo", "index-now", "status"];
const WATCH_REFETCH_MS = 5000;
/** How long after queuing a send to keep checking its progress. */
const QUEUED_WATCH_MS = 60_000;

/** Sends the sitemap's changed pages to IndexNow from the Operations page, showing the last send. */
const SendIndexNow: SlotComponent<
	ReturnType<typeof sendIndexNowConfig>
> = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const permissions = usePermissions();
	const client = useQueryClient();
	const [open, setOpen] = createSignal(false);
	let watchUntil = 0;
	let sawPending = false;

	// ----------------------------------
	// Queries
	const status = useQuery(() => ({
		queryKey: statusQueryKey,
		queryFn: () =>
			request({ url: indexNow.statusRoute, parse: parseIndexNowStatus }),
		enabled: permissions.can(Permissions.SettingsRead),
		//* sends run in the background, so check back for a while after queuing one. Stops once the
		//* pending pages it marked are sent, when time is up, or when the status can't be read.
		refetchInterval: (query) => {
			if (query.state.status === "error" || Date.now() >= watchUntil) {
				return false;
			}
			const pending = query.state.data?.pending ?? 0;
			if (pending > 0) sawPending = true;
			else if (sawPending) return false;
			return WATCH_REFETCH_MS;
		},
	}));

	// ----------------------------------
	// Mutations
	const send = useMutation(() => ({
		mutationFn: () => request({ url: indexNow.sendRoute, method: "POST" }),
		onSuccess: () => {
			setOpen(false);
			watchUntil = Date.now() + QUEUED_WATCH_MS;
			sawPending = false;
			client.invalidateQueries({ queryKey: statusQueryKey });
			toast({
				title: t("plugin.seo.index.now.maintenance.toast.title"),
				message: t("plugin.seo.index.now.maintenance.toast.message"),
				status: "success",
			});
		},
	}));

	// ----------------------------------
	// Render
	return (
		<>
			<MaintenanceTile
				icon="share"
				title={t("plugin.seo.index.now.maintenance.title")}
				description={t("plugin.seo.index.now.maintenance.description")}
				status={
					<Switch>
						<Match when={status.isLoading}>
							<Skeleton class="inline-block align-middle">
								<span class="skeleton block h-3 w-20" />
							</Skeleton>
						</Match>
						<Match when={status.isError}>
							<span class="text-danger">
								{t("plugin.seo.index.now.maintenance.status.error")}
							</span>
						</Match>
						<Match
							when={status.data?.pending === 0 && status.data.lastSend === null}
						>
							{t("plugin.seo.index.now.maintenance.status.never")}
						</Match>
						<Match when={status.data}>
							{(data) => (
								<>
									<Show when={data().pending > 0}>
										{t("plugin.seo.index.now.maintenance.status.pending", {
											count: data().pending,
										})}
									</Show>
									<Show when={data().pending > 0 && data().lastSend}>
										{" · "}
									</Show>
									<Show when={data().lastSend}>
										{(lastSend) => (
											<>
												{t("plugin.seo.index.now.maintenance.status.sent", {
													count: lastSend().urlCount,
												})}
												{" · "}
												<DateText
													date={lastSend().sentAt}
													relative
													class="text-xs"
												/>
											</>
										)}
									</Show>
								</>
							)}
						</Match>
					</Switch>
				}
				action={
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setOpen(true)}
					>
						{t("plugin.seo.index.now.maintenance.action")}
					</Button>
				}
			/>
			<Modal.Confirm
				confirmVariant="primary"
				open={open()}
				onOpenChange={setOpen}
				title={t("plugin.seo.index.now.maintenance.modal.title")}
				description={t("plugin.seo.index.now.maintenance.modal.description")}
				loading={send.isPending}
				error={send.error?.message}
				onConfirm={() => send.mutate()}
				onCancel={() => {
					setOpen(false);
					send.reset();
				}}
			/>
		</>
	);
};

export default SendIndexNow;
