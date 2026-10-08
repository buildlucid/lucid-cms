import classnames from "classnames";
import type { IconTypes } from "solid-icons";
import { TbOutlineLayoutGrid, TbOutlineWand } from "solid-icons/tb";
import { type Component, For } from "solid-js";
import { Dynamic } from "solid-js/web";
import userPreferencesStore, {
	type HomeView,
} from "@/store/userPreferencesStore/userPreferencesStore";
import T from "@/translations";
import { getHomeView } from "@/utils/home-view";
import { startViewTransition } from "@/utils/view-transition";

const views = [
	{ value: "ask", label: "home.view.ask", icon: TbOutlineWand },
	{
		value: "overview",
		label: "home.view.overview",
		icon: TbOutlineLayoutGrid,
	},
] as const satisfies ReadonlyArray<{
	value: HomeView;
	label: string;
	icon: IconTypes;
}>;

/** Switches Home between the chat box and the overview, and remembers the choice. */
const HomeViewSwitch: Component<{ class?: string }> = (props) => {
	// ----------------------------------------
	// Functions
	const select = (view: HomeView) => {
		if (getHomeView() === view) return;
		startViewTransition(() => userPreferencesStore.setHomeView(view), {
			ready: `[data-home-view="${view}"]`,
		});
	};

	// ----------------------------------------
	// Render
	return (
		<fieldset
			class={classnames(
				"inline-flex h-9 shrink-0 items-stretch gap-0.5 rounded-md border border-border bg-input p-0.5",
				props.class,
			)}
		>
			<legend class="sr-only">{T()("home.view.label")}</legend>
			<For each={views}>
				{(view) => (
					<button
						type="button"
						aria-pressed={getHomeView() === view.value}
						onClick={() => select(view.value)}
						class={classnames(
							"flex items-center gap-1.5 rounded-[5px] px-2.5 text-xs transition-colors focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary",
							{
								"bg-card text-title shadow-xs": getHomeView() === view.value,
								"text-muted hover:text-body": getHomeView() !== view.value,
							},
						)}
					>
						<Dynamic component={view.icon} size={11} />
						{T()(view.label)}
					</button>
				)}
			</For>
		</fieldset>
	);
};

export default HomeViewSwitch;
