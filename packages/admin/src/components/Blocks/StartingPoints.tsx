import { A } from "@solidjs/router";
import classNames from "classnames";
import {
	FaSolidBox,
	FaSolidEnvelope,
	FaSolidGear,
	FaSolidPhotoFilm,
	FaSolidUserLock,
	FaSolidUsers,
} from "solid-icons/fa";
import { type Component, For, Match, Switch } from "solid-js";
import T from "@/translations";
import spawnToast from "@/utils/spawn-toast";

interface StartingPointsProps {
	links: Array<{
		title: string;
		description: string;
		href: string;
		icon: "collection" | "media" | "users" | "settings" | "roles" | "email";
		permission?: boolean;
	}>;
}

const StartingPoints: Component<StartingPointsProps> = (props) => {
	// ----------------------------------
	// Classes
	const iconClasses = classNames("w-4 h-4 text-primary-contrast");

	// -------------------------------
	// Render
	return (
		<section>
			<h2 class="mb-4">{T()("quick_links")}</h2>
			<ul class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mb-4 pb-4 last:mb-0 last:pb-0">
				<For each={props.links}>
					{(link) => (
						<li
							class={classNames(
								"relative bg-card-base border border-border p-4 rounded-md h-full flex space-x-4",
								{
									"[&:has(:focus-visible)]:ring-1 [&:has(:focus-visible)]:ring-primary-base":
										link.permission !== false,
								},
							)}
						>
							<div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary-base">
								<Switch>
									<Match when={link.icon === "collection"}>
										<FaSolidBox class={iconClasses} />
									</Match>
									<Match when={link.icon === "media"}>
										<FaSolidPhotoFilm class={iconClasses} />
									</Match>
									<Match when={link.icon === "users"}>
										<FaSolidUsers class={iconClasses} />
									</Match>
									<Match when={link.icon === "settings"}>
										<FaSolidGear class={iconClasses} />
									</Match>
									<Match when={link.icon === "roles"}>
										<FaSolidUserLock class={iconClasses} />
									</Match>
									<Match when={link.icon === "email"}>
										<FaSolidEnvelope class={iconClasses} />
									</Match>
								</Switch>
							</div>
							<div>
								<h3 class="text-sm font-medium">
									<A
										href={link.href}
										class="focus:outline-hidden text-title hover:text-primary-hover"
										aria-disabled={link.permission === false}
										onClick={(e) => {
											if (link.permission === false) {
												spawnToast({
													title: T()("no_permission_toast_title"),
													message: T()("no_permission_toast_message"),
													status: "warning",
												});
												e.preventDefault();
												e.stopPropagation();
											}
										}}
									>
										<span class="absolute inset-0" aria-hidden="true" />
										<span>{link.title}</span>
										<span aria-hidden="true"> &rarr;</span>
									</A>
								</h3>
								<p class="mt-1 text-sm text-unfocused line-clamp-2">
									{link.description}
								</p>
							</div>
						</li>
					)}
				</For>
			</ul>
		</section>
	);
};

export default StartingPoints;
