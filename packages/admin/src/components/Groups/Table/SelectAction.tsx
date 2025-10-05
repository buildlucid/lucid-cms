import T from "@/translations";
import type { Component } from "solid-js";
import Button from "@/components/Partials/Button";

interface SelectActionProps {
	data: {
		selected: number;
	};
	callbacks: {
		reset: () => void;
		delete: () => void;
	};
}

export const SelectAction: Component<SelectActionProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div class="fixed bottom-4 md:bottom-6 left-[220px] right-0 flex justify-center items-center z-40 pointer-events-none px-4">
			<div class="pointer-events-auto bg-card-base p-2 border border-border rounded-md max-w-[400px] w-full justify-between flex items-center">
				<p class="text-sm">
					<span class="font-bold">
						{props.data.selected > 1
							? `${props.data.selected} ${T()("items")}`
							: `1 ${T()("item")}`}
					</span>{" "}
					{T()("selected")}
				</p>
				<div class="ml-2 flex gap-2">
					<Button
						theme="border-outline"
						size="small"
						onClick={props.callbacks.reset}
					>
						{T()("reset")}
					</Button>
					<Button theme="danger" size="small" onClick={props.callbacks.delete}>
						{T()("delete")}
					</Button>
				</div>
			</div>
		</div>
	);
};
