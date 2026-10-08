import { A } from "@solidjs/router";
import classnames from "classnames";
import { TbOutlineArrowRight } from "solid-icons/tb";
import { type Component, createMemo, For, Show } from "solid-js";
import api from "@/services/api";
import T from "@/translations";
import dateHelpers from "@/utils/date-helpers";

/** The reader's chats that are waiting for an answer, newest first. */
const AgentWaitingChats: Component<{
	/** Narrows the list to one agent when the reader can use several. */
	agentKey?: string;
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Queries
	const waiting = api.agent.useGetConversations({
		queryParams: {
			filters: { status: "waiting", agentKey: () => props.agentKey },
			perPage: 3,
		},
	});

	// ----------------------------------------
	// Memos
	const conversations = createMemo(() => waiting.data?.data ?? []);
	const total = createMemo(
		() => waiting.data?.meta.total ?? conversations().length,
	);
	const historyHref = createMemo(() => {
		const params = new URLSearchParams({ "filter[status]": "waiting" });
		if (props.agentKey) params.set("filter[agentKey]", props.agentKey);
		return `/lucid/agent/history?${params}`;
	});

	// ----------------------------------------
	// Render
	return (
		<Show when={conversations().length > 0}>
			<section
				class={classnames(
					"flex flex-col gap-1 motion-safe:animate-fade-in",
					props.class,
				)}
				aria-labelledby="agent-waiting"
			>
				<div class="flex items-center justify-between gap-3 px-1">
					<h3
						id="agent-waiting"
						class="flex items-center gap-2 text-xs font-normal text-muted"
					>
						{T()("agent.home.waiting")}
						<span class="rounded-full bg-warning-low px-1.5 text-[11px] leading-4 tabular-nums text-warning-low-foreground">
							{total()}
						</span>
					</h3>
					<A
						href={historyHref()}
						class="group flex items-center gap-1.5 rounded-md px-1 text-xs text-muted transition-colors hover:text-body focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
					>
						{T()("agent.home.waiting.all")}
						<TbOutlineArrowRight
							size={9}
							class="transition-transform group-hover:translate-x-0.5 rtl:rotate-180"
						/>
					</A>
				</div>
				<ul class="flex flex-col">
					<For each={conversations()}>
						{(conversation) => (
							<li>
								<A
									href={`/lucid/agent/chats/${conversation.id}`}
									class="group -mx-1 flex items-center gap-2.5 rounded-lg px-2 py-1.5 text-sm transition-colors hover:bg-card-hover focus:outline-hidden focus-visible:ring-1 focus-visible:ring-primary"
								>
									<span
										class="size-1.5 shrink-0 rounded-full bg-warning"
										aria-hidden="true"
									/>
									<span class="min-w-0 grow truncate text-body transition-colors group-hover:text-title">
										{conversation.title}
									</span>
									<Show when={conversation.updatedAt}>
										{(updatedAt) => (
											<time
												datetime={updatedAt()}
												class="shrink-0 text-xs text-muted"
											>
												{dateHelpers.formatTimestamp(updatedAt())}
											</time>
										)}
									</Show>
								</A>
							</li>
						)}
					</For>
				</ul>
			</section>
		</Show>
	);
};

export default AgentWaitingChats;
