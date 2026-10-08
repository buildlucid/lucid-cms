import { Collapsible } from "@kobalte/core";
import classNames from "classnames";
import { TbOutlineChevronRight } from "solid-icons/tb";
import { type Component, type JSXElement, Show } from "solid-js";
import useUserPreference from "@/hooks/useUserPreference/useUserPreference";
import userPreferencesStore from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";

/**
 * A titled, collapsible group of `NavigationLink`s. Its open state is saved per
 * user under `id`, so built-in sections use a `lucid:` prefix to avoid clashing
 * with collection and extension group keys.
 */
export const NavigationSection: Component<{
	id: string;
	title: string;
	/** Whether the current page belongs to this section. */
	active?: boolean;
	capitalize?: boolean;
	children: JSXElement;
}> = (props) => {
	// ----------------------------------
	// State & Hooks
	const [open, setOpen] = useUserPreference({
		value: () => userPreferencesStore.getNavigationGroupOpen(props.id),
		setValue: (value) =>
			userPreferencesStore.setNavigationGroupOpen(props.id, value),
		defaultValue: true,
	});

	// ----------------------------------
	// Render
	return (
		<Collapsible.Root open={open()} onOpenChange={setOpen} class="mt-3">
			<Collapsible.Trigger
				class={classNames(
					"group flex h-7 w-full items-center gap-2 rounded-md px-2 text-start text-xs font-medium transition-colors duration-200 hover:text-title outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
					props.active && !open() ? "text-title" : "text-body",
				)}
			>
				<span
					class={classNames("min-w-0 flex-1 truncate", {
						capitalize: props.capitalize,
					})}
				>
					{props.title}
				</span>
				<Show when={props.active && !open()}>
					<span class="size-1.5 shrink-0 rounded-full bg-primary">
						<span class="sr-only">{T()("navigation.section.current")}</span>
					</span>
				</Show>
				<TbOutlineChevronRight
					class={classNames(
						"size-2.5 shrink-0 text-icon transition-[transform,opacity] duration-200",
						open()
							? "rotate-90 pointer-fine:opacity-0 pointer-fine:group-hover:opacity-100 pointer-fine:group-focus-visible:opacity-100"
							: "rtl:rotate-180",
					)}
				/>
			</Collapsible.Trigger>
			<Collapsible.Content>
				<ul class="mt-1">{props.children}</ul>
			</Collapsible.Content>
		</Collapsible.Root>
	);
};
