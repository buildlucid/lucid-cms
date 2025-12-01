import T from "@/translations";
import { DropdownMenu } from "@kobalte/core";
import { type Component, createMemo } from "solid-js";
import classNames from "classnames";
import DropdownContent from "@/components/Partials/DropdownContent";
import spawnToast from "@/utils/spawn-toast";
import { FaSolidEllipsisVertical } from "solid-icons/fa";

export const DocumentActions: Component<{
	onDelete: () => void;
	deletePermission?: boolean;
	disabled?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Memos
	const isDisabled = createMemo(() => {
		return props.disabled;
	});

	// ----------------------------------------
	// Functions
	const handleDeleteClick = () => {
		if (props.deletePermission === false) {
			spawnToast({
				title: T()("no_permission_toast_title"),
				message: T()("no_permission_toast_message"),
				status: "warning",
			});
			return;
		}
		props.onDelete();
	};

	// ----------------------------------------
	// Render
	return (
		<DropdownMenu.Root>
			<DropdownMenu.Trigger
				class={classNames(
					"flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-md relative font-base",
					"bg-input-base border border-border hover:border-transparent hover:bg-secondary-hover fill-input-contrast text-title hover:text-secondary-contrast ring-primary-base",
					"w-9 h-9 p-0 min-w-[36px]!",
					{
						"opacity-80 cursor-not-allowed":
							isDisabled() || props.deletePermission === false,
					},
				)}
				disabled={isDisabled()}
			>
				<FaSolidEllipsisVertical />
			</DropdownMenu.Trigger>
			<DropdownContent
				options={{
					as: "div",
					rounded: true,
					class: "p-1.5! z-60",
				}}
			>
				<ul class="flex flex-col gap-y-0.5">
					<li>
						<DropdownMenu.Item
							class={classNames(
								"flex items-center gap-3 justify-between px-2 py-1 text-sm rounded-md cursor-pointer outline-none focus-visible:ring-1 focus:ring-primary-base transition-colors text-left hover:bg-dropdown-hover hover:text-dropdown-contrast",
								{
									"opacity-50 cursor-not-allowed":
										props.deletePermission === false || isDisabled(),
									"text-title hover:text-error-contrast hover:bg-error-hover":
										props.deletePermission !== false && !isDisabled(),
								},
							)}
							disabled={props.deletePermission === false || isDisabled()}
							onSelect={handleDeleteClick}
						>
							<span class="line-clamp-1">{T()("delete_document")}</span>
						</DropdownMenu.Item>
					</li>
				</ul>
			</DropdownContent>
		</DropdownMenu.Root>
	);
};
