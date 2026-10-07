import { FaSolidTrashCan } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

const ShowDeletedToggle: Component<{
	value: boolean;
	onChange: (_value: boolean) => void;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Button
			variant={props.value ? "danger" : "outline"}
			size="sm"
			shape={props.value ? "standard" : "square"}
			class="gap-2"
			aria-pressed={props.value}
			aria-label={props.value ? undefined : T()("actions.show.deleted")}
			title={props.value ? undefined : T()("actions.show.deleted")}
			onClick={() => props.onChange(!props.value)}
		>
			<FaSolidTrashCan size={12} />
			<Show when={props.value}>
				<span>{T()("actions.hide.deleted")}</span>
			</Show>
		</Button>
	);
};

export default ShowDeletedToggle;
