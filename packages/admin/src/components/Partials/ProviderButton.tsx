import type { AuthProvidersResponse } from "@types";
import { FaSolidCircleUser } from "solid-icons/fa";
import { type Component, Show } from "solid-js";
import Spinner from "@/components/Partials/Spinner";
import T from "@/translations";

const ProviderButton: Component<{
	provider: AuthProvidersResponse["providers"][number];
	onClick: () => void;
	disabled: boolean;
	isLoading?: boolean;
}> = (props) => {
	return (
		<button
			type="button"
			class="px-6 py-3 h-12 text-base flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-md relative disabled:cursor-not-allowed disabled:opacity-80 font-base border border-border hover:border-transparent text-body fill-title bg-input-base hover:bg-secondary-hover hover:text-secondary-contrast hover:fill-secondary-contrast w-full group"
			onClick={props.onClick}
			disabled={props.disabled || props.isLoading}
		>
			<Show when={props.isLoading}>
				<div class="flex items-center justify-center absolute inset-0 z-10 rounded-md bg-card-base/50">
					<Spinner size="sm" />
				</div>
			</Show>
			{props.provider.icon ? (
				<img
					src={props.provider.icon}
					alt={props.provider.name}
					class="mr-3 h-4 w-4 group-hover:invert transition-all duration-200"
				/>
			) : (
				<FaSolidCircleUser class="size-4 mr-3" />
			)}
			{T()("continue_with")} {props.provider.name}
		</button>
	);
};

export default ProviderButton;
