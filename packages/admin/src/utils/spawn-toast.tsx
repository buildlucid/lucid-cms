import toast from "solid-toast";
import CustomToast from "@/components/Partials/CustomToast";

interface SpawnToastProps {
	title: string;
	message?: string;
	status?: "success" | "error" | "warning" | "info";
	duration?: number;
}

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
