import { TbOutlineWorld } from "solid-icons/tb";
import { type Component, Show } from "solid-js";
import siteStore from "@/store/siteStore/siteStore";
import T from "@/translations";
import {
	getNavigationActionClasses,
	type NavigationActionVariant,
} from "@/utils/navigation";

/** Opens `urls.site` in a new tab when configured. */
export const SiteLink: Component<{
	size?: "sm" | "md";
	variant?: NavigationActionVariant;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<Show when={siteStore.get.siteUrl}>
			{(url) => (
				<a
					href={url()}
					target="_blank"
					rel="noreferrer"
					class={getNavigationActionClasses(props)}
					aria-label={T()("navigation.site.view")}
					title={T()("navigation.site.view")}
				>
					<TbOutlineWorld class="size-3.5" />
				</a>
			)}
		</Show>
	);
};
