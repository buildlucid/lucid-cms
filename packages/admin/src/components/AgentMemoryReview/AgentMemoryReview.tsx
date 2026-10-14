import type { AgentMemoryReviewItem, AgentMemoryScope } from "@lucidcms/types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	For,
	Match,
	on,
	Show,
	Switch,
} from "solid-js";
import type { AgentWidgetComponent } from "@/components/AgentWidget/types";
import RadioCards from "@/components/RadioCards/RadioCards";
import SectionHeading from "@/components/SectionHeading/SectionHeading";
import Textarea from "@/components/Textarea/Textarea";
import type { AdminOptions } from "@/extensions/types/config";
import T from "@/translations";
import { isMemoryReviewData } from "@/utils/agent-tools";

const MemoryList: Component<{
	title?: string;
	memories: AgentMemoryReviewItem[];
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div>
			<Show when={props.title}>
				{(title) => <SectionHeading title={title()} level={3} />}
			</Show>
			<ul class="flex flex-col gap-2">
				<For each={props.memories}>
					{(memory) => (
						<li class="flex items-start justify-between gap-3 rounded-md border border-border px-3 py-2">
							<p class="min-w-0 text-sm text-body">{memory.content}</p>
							<span class="shrink-0 text-xs text-muted">
								{T()(`agent.memory.scope.${memory.scope}`)}
							</span>
						</li>
					)}
				</For>
			</ul>
		</div>
	);
};

/** Reviews and edits proposed memory saves or confirms deletions. */
const AgentMemoryReview: AgentWidgetComponent<AdminOptions | undefined> = (
	props,
) => {
	// ----------------------------------------
	// State & Hooks
	const [content, setContent] = createSignal("");
	const [scope, setScope] = createSignal<AgentMemoryScope>("personal");

	// ----------------------------------------
	// Memos
	const data = createMemo(() =>
		isMemoryReviewData(props.data) ? props.data : undefined,
	);
	const save = createMemo(() => {
		const current = data();
		return current?.action === "save" ? current : undefined;
	});
	const forgotten = createMemo(() => {
		const current = data();
		return current?.action === "delete" ? current.memories : undefined;
	});
	const disabled = createMemo(
		() =>
			props.interaction?.status !== "active" || props.interaction.submitting,
	);

	// ----------------------------------------
	// Effects
	createEffect(
		on(save, (value) => {
			if (!value) return;
			setContent(value.content);
			setScope(
				value.scopes.includes(value.scope)
					? value.scope
					: (value.scopes[0] ?? value.scope),
			);
		}),
	);
	createEffect(() => {
		const interaction = props.interaction;
		if (interaction?.status !== "active") return;
		if (forgotten()) {
			interaction.setResponse({});
			return;
		}

		const current = save();
		const text = content().trim();
		interaction.setResponse(
			current && text && text.length <= current.contentChars
				? { content: text, scope: scope() }
				: undefined,
		);
	});

	// ----------------------------------------
	// Render
	return (
		<Switch
			fallback={
				<p class="text-sm text-muted">{T()("agent.widget.unavailable")}</p>
			}
		>
			<Match when={save()}>
				{(current) => (
					<div class="flex flex-col gap-3">
						<Textarea
							id="agent-memory-review-content"
							name="agent-memory-review-content"
							label={T()("agent.memory.content")}
							value={content()}
							onChange={setContent}
							description={T()("agent.memory.content.count", {
								count: content().trim().length,
								max: current().contentChars,
							})}
							maxLength={current().contentChars}
							disabled={disabled()}
							rows={3}
							resize
						/>
						<Show when={current().scopes.length > 1}>
							<RadioCards
								id="agent-memory-review-scope"
								name="agent-memory-review-scope"
								label={T()("agent.memory.scope")}
								value={scope()}
								onChange={setScope}
								columns={2}
								disabled={disabled()}
								options={current().scopes.map((value) => ({
									value,
									label: T()(`agent.memory.scope.${value}`),
									description: T()(`agent.memory.scope.${value}.description`),
								}))}
							/>
						</Show>
						<Show when={current().replaces.length > 0}>
							<MemoryList
								title={T()(
									current().replaces.length === 1
										? "agent.memory.review.replaces.one"
										: "agent.memory.review.replaces",
								)}
								memories={current().replaces}
							/>
						</Show>
					</div>
				)}
			</Match>
			<Match when={forgotten()}>
				{(memories) => <MemoryList memories={memories()} />}
			</Match>
		</Switch>
	);
};

export default AgentMemoryReview;
