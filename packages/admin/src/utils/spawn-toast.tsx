import toast from "solid-toast";
import CustomToast from "@/components/CustomToast/CustomToast";

interface SpawnToastProps {
	title: string;
	message?: string;
	/** @default "info" */
	status?: "success" | "error" | "warning" | "info";
	/** In milliseconds. */
	duration?: number;
	/** A button that runs `onClick` and closes the toast, such as undoing what it reports. */
	action?: { label: string; onClick: () => void };
}

/**
 * Shows a toast notification.
 *
 * @example
 * ```ts
 * import { useTranslation } from "@lucidcms/admin/hooks";
 * import { toast } from "@lucidcms/admin/utils";
 *
 * const { t } = useTranslation();
 *
 * toast({ title: t("redirects.saved"), status: "success" });
 * ```
 */
const spawnToast = (props: SpawnToastProps) => {
	toast.custom(
		(t) => (
			<CustomToast
				toast={t}
				title={props.title}
				message={props.message}
				type={props.status || "info"}
				duration={props.duration}
				action={props.action}
			/>
		),
		{
			id: `${props.title}-${props.message}-${props.status}`,
		},
	);
};

export default spawnToast;
