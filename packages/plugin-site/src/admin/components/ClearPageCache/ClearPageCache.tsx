import { Button, MaintenanceTile, Modal } from "@lucidcms/admin/components";
import { useTranslation } from "@lucidcms/admin/hooks";
import { request } from "@lucidcms/admin/services";
import type { MaintenanceSlotComponent } from "@lucidcms/admin/types";
import { toast } from "@lucidcms/admin/utils";
import { useMutation } from "@tanstack/solid-query";
import { createSignal } from "solid-js";
import type {} from "../../translations.js";

/** Clears the site's stored pages and fragments from the Operations page. */
const ClearPageCache: MaintenanceSlotComponent<{ route: string }> = (props) => {
	// ----------------------------------
	// State & Hooks
	const { t } = useTranslation();
	const [open, setOpen] = createSignal(false);

	// ----------------------------------
	// Mutations
	const clear = useMutation(() => ({
		mutationFn: () => request({ url: props.options.route, method: "POST" }),
		onSuccess: () => {
			setOpen(false);
			toast({
				title: t("plugin.site.maintenance.toast.title"),
				message: t("plugin.site.maintenance.toast.message"),
				status: "success",
			});
		},
	}));

	// ----------------------------------
	// Render
	return (
		<>
			<MaintenanceTile
				icon="world"
				title={t("plugin.site.maintenance.title")}
				description={t("plugin.site.maintenance.description")}
				action={
					<Button
						type="button"
						size="sm"
						variant="outline"
						onClick={() => setOpen(true)}
					>
						{t("plugin.site.maintenance.action")}
					</Button>
				}
			/>
			<Modal.Confirm
				confirmVariant="primary"
				open={open()}
				onOpenChange={setOpen}
				title={t("plugin.site.maintenance.modal.title")}
				description={t("plugin.site.maintenance.modal.description")}
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

export default ClearPageCache;
