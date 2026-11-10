import { Button, MaintenanceTile, Modal } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { MaintenanceSlotComponent } from "@lucidcms/admin/types";
import { toast } from "@lucidcms/admin/utils";
import { useMutation } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import { CLEAR_PATH_HISTORY_ROUTE } from "../../../constants.js";
import type {} from "../../translations.js";

/** Queues clearing every page's previous paths from the Operations page. */
const ClearPathHistory: MaintenanceSlotComponent = () => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Mutations
	const clear = useMutation(() => ({
		mutationFn: () =>
			request({ url: CLEAR_PATH_HISTORY_ROUTE, method: "POST" }),
		onSuccess: () => {
			setOpen(false);
			toast({
				title: t("plugin.pages.path.history.toast.title"),
				message: t("plugin.pages.path.history.toast.message"),
				status: "success",
			});
		},
	}));

	// ----------------------------------
	// Render
	return (
		<>
			<MaintenanceTile
				icon="trash"
				title={t("plugin.pages.path.history.title")}
				description={t("plugin.pages.path.history.description")}
				action={
					<Button
						type="button"
						size="sm"
						variant="danger-outline"
						onClick={() => setOpen(true)}
					>
						{t("plugin.pages.path.history.action")}
					</Button>
				}
			/>
			<Modal.Confirm
				confirmVariant="danger"
				open={open()}
				onOpenChange={setOpen}
				title={t("plugin.pages.path.history.modal.title")}
				description={t("plugin.pages.path.history.modal.description")}
				confirmLabel={t("plugin.pages.path.history.action")}
				loading={clear.isPending}
				error={clear.error?.message}
				onConfirm={() => clear.mutate()}
				onCancel={() => {
					setOpen(false);
					clear.reset();
				}}
			/>
		</>
	);
};

export default ClearPathHistory;
