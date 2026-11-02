import { Button, MaintenanceTile, Modal } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { MaintenanceSlotComponent } from "@lucidcms/admin/types";
import { toast } from "@lucidcms/admin/utils";
import { useMutation } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { REBUILD_PATHS_ROUTE } from "../../../constants.js";
import type {} from "../../translations.js";

/** Queues a rebuild of every page's path from the Operations page. */
const RebuildPaths: MaintenanceSlotComponent = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Mutations
	const rebuild = useMutation(() => ({
		mutationFn: () => request({ url: REBUILD_PATHS_ROUTE, method: "POST" }),
		onSuccess: () => {
			setOpen(false);
			toast({
				title: t("plugin.pages.maintenance.toast.title"),
				message: t("plugin.pages.maintenance.toast.message"),
				status: "success",
			});
		},
	}));

	// ----------------------------------
	// Render
	return (
		<>
			<MaintenanceTile
				icon="sitemap"
				title={t("plugin.pages.maintenance.title")}
				description={t("plugin.pages.maintenance.description")}
				action={
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setOpen(true)}
					>
						{t("plugin.pages.maintenance.action")}
					</Button>
				}
			/>
			<Modal.Confirm
				confirmVariant="primary"
				open={open()}
				onOpenChange={setOpen}
				title={t("plugin.pages.maintenance.modal.title")}
				description={t("plugin.pages.maintenance.modal.description")}
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

export default RebuildPaths;
