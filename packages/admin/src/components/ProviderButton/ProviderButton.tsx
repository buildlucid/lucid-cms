import type { AuthProviders } from "@types";
import classNames from "classnames";
import { TbOutlineUserCircle } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import T from "@/translations";

/** A "Continue with" button for an auth provider, used on the login and invitation pages. */
const ProviderButton: Component<{
	provider: AuthProviders["providers"][number];
	onClick: () => void;
	disabled: boolean;
	isLoading?: boolean;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<button
			type="button"
			class={classNames(
				"px-6 py-3 h-12 text-base flex items-center justify-center min-w-max text-center focus:outline-none outline-none focus-visible:ring-1 duration-200 transition-colors rounded-md relative border border-border hover:border-transparent text-body bg-input hover:bg-secondary-hover hover:text-secondary-foreground w-full group",
				{
					"disabled:cursor-not-allowed disabled:opacity-80": !props.isLoading,
				},
			)}
			onClick={props.onClick}
			disabled={props.disabled || props.isLoading}
			aria-busy={props.isLoading ? "true" : undefined}
		>
			<Show when={props.isLoading}>
				<span class="loading-overlay" aria-hidden="true" />
			</Show>
			{props.provider.icon ? (
				<img
					src={props.provider.icon}
					alt={props.provider.name}
					class="mr-3 h-4 w-4 group-hover:invert transition-all duration-200"
				/>
			) : (
				<TbOutlineUserCircle class="size-4 mr-3" />
			)}
			{T()("auth.providers.continue.with")} {props.provider.name}
		</button>
	);
};

export default ProviderButton;
