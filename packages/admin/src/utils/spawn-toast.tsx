import toast from "solid-toast";
import CustomToast from "@/components/CustomToast/CustomToast";

interface SpawnToastProps {
	title: string;
	message?: string;
	status?: "success" | "error" | "warning" | "info";
	duration?: number;
}

/**
 * Shows a notification. Status defaults to info; duration is in milliseconds.
 *
 * @example
 * ```ts
 * import { toast } from "@lucidcms/admin/utils";
 *
 * toast({ title: "Settings saved", status: "success" });
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
