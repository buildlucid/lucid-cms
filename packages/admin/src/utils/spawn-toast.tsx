import toast from "solid-toast";
import CustomToast from "@/components/CustomToast/CustomToast";

interface SpawnToastProps {
	title: string;
	message?: string;
	/** @default "info" */
	status?: "success" | "error" | "warning" | "info";
	/** In milliseconds. */
	duration?: number;
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
			/>
		),
		{
			id: `${props.title}-${props.message}-${props.status}`,
		},
	);
};

export default spawnToast;
