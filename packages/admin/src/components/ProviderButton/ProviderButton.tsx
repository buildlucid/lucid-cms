import type { AuthProviders } from "@types";
import classNames from "classnames";
import { TbOutlineUserCircle } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import { getButtonClasses } from "@/components/Button/classes";
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
				getButtonClasses({
					variant: "outline",
					size: "lg",
					shape: "standard",
					loading: props.isLoading,
				}),
				"w-full",
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
					class="mr-2.5 h-4 w-4"
				/>
			) : (
				<TbOutlineUserCircle class="size-4 mr-2.5" />
			)}
			{T()("auth.providers.continue.with")} {props.provider.name}
		</button>
	);
};

export default ProviderButton;
