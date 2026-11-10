import {
	Button,
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
import { createMemo, createSignal } from "solid-js";
import { REBUILD_ROUTE, STATUS_ROUTE } from "../../../constants.js";
import summariseStatuses from "../../utils/summarise-statuses.js";
import type rebuildIndexesConfig from "./config.js";

const statusQueryKey = ["typesense", "status"];
const REBUILDING_REFETCH_MS = 5000;

/** Rebuilds every search index from the Operations page, showing whether they're up to date. */
const RebuildIndexes: SlotComponent<
	ReturnType<typeof rebuildIndexesConfig>
> = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const permissions = usePermissions();
	const client = useQueryClient();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Queries
	const status = useQuery(() => ({
		queryKey: statusQueryKey,
		queryFn: () => request({ url: STATUS_ROUTE, parse: summariseStatuses }),
		enabled: permissions.can(Permissions.SettingsRead),
		//* rebuilds finish in the background, so check back until they're done
		refetchInterval: (query) =>
			query.state.data?.rebuilding ? REBUILDING_REFETCH_MS : false,
	}));

	// ----------------------------------
	// Mutations
	const rebuild = useMutation(() => ({
		mutationFn: () => request({ url: REBUILD_ROUTE, method: "POST" }),
		onSuccess: () => {
			setOpen(false);
			toast({
				title: t("plugin.typesense.maintenance.toast.title"),
				message: t("plugin.typesense.maintenance.toast.message"),
				status: "success",
			});
			client.invalidateQueries({ queryKey: statusQueryKey });
		},
	}));

	// ----------------------------------
	// Memos
	const statusText = createMemo(() => {
		const summary = status.data;
		if (!summary) return undefined;
		if (summary.rebuilding) {
			return t("plugin.typesense.maintenance.status.rebuilding");
		}
		if (summary.failed) return t("plugin.typesense.maintenance.status.failed");
		if (summary.pending > 0) {
			return t("plugin.typesense.maintenance.status.pending", {
				count: summary.pending,
			});
		}
		return t("plugin.typesense.maintenance.status.current");
	});

	// ----------------------------------
	// Render
	return (
		<>
			<MaintenanceTile
				icon="search"
				title={t("plugin.typesense.maintenance.title")}
				description={t("plugin.typesense.maintenance.description")}
				status={
					status.isLoading ? (
						<Skeleton class="inline-block align-middle">
							<span class="skeleton block h-3 w-20" />
						</Skeleton>
					) : (
						statusText()
					)
				}
				action={
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setOpen(true)}
					>
						{t("plugin.typesense.maintenance.action")}
					</Button>
				}
			/>
			<Modal.Confirm
				confirmVariant="primary"
				open={open()}
				onOpenChange={setOpen}
				title={t("plugin.typesense.maintenance.modal.title")}
				description={t("plugin.typesense.maintenance.modal.description")}
				loading={rebuild.isPending}
				error={rebuild.error?.message}
				onConfirm={() => rebuild.mutate()}
				onCancel={() => {
					setOpen(false);
					rebuild.reset();
				}}
			/>
		</>
	);
};

export default RebuildIndexes;
