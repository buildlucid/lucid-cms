import { A } from "@solidjs/router";
import classnames from "classnames";
import { type Component, For, Show } from "solid-js";
import NeedsYouList from "@/components/NeedsYouList/NeedsYouList";
import useNeedsYou from "@/hooks/useNeedsYou/useNeedsYou";
import T from "@/translations";

const AgentNeedsYou: Component<{
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// State & Hooks
	const needsYou = useNeedsYou({ limit: 5 });

	// ----------------------------------------
	// Render
	return (
		<Show when={needsYou.items().length > 0}>
			<section
				class={classnames(
					"flex flex-col gap-1 motion-safe:animate-fade-in",
					props.class,
				)}
				aria-labelledby="agent-needs-you"
			>
				<div class="flex items-center justify-between gap-3 px-1">
					<h3
						id="agent-needs-you"
						class="flex items-center gap-2 text-xs font-normal text-muted"
					>
						{T()("home.needs.you.title")}
					</h3>
					<Show when={needsYou.total() > needsYou.items().length}>
						<div class="flex items-center gap-3">
							<For each={needsYou.groups()}>
								{(group) => (
									<A
										href={group.href}
										class="rounded-md px-1 text-xs text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
									>
										{T()(`home.needs.you.group.${group.kind}`, {
											count: group.count,
										})}
									</A>
								)}
							</For>
						</div>
					</Show>
				</div>
				<NeedsYouList class="-mx-1" items={needsYou.items()} />
			</section>
		</Show>
	);
};

export default AgentNeedsYou;
