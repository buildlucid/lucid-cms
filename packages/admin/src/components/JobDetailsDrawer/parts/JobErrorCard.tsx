import classNames from "classnames";
import { TbOutlineChevronDown } from "solid-icons/tb";
import { type Component, createSignal, Show } from "solid-js";
import Copy from "@/components/Copy/Copy";
import T from "@/translations";

interface JobErrorCardProps {
	title: string;
	message: string;
	stack: string | null;
}

const JobErrorCard: Component<JobErrorCardProps> = (props) => {
	// ----------------------------------------
	// State
	const [stackOpen, setStackOpen] = createSignal(false);

	// ----------------------------------------
	// Render
	return (
		<div class="mb-3 overflow-hidden rounded-md border border-danger-low-border bg-danger-low">
			<div class="p-4">
				<h3 class="mb-1 text-sm font-medium text-title">{props.title}</h3>
				<p class="break-words text-sm text-body">{props.message}</p>
			</div>
			<Show when={props.stack}>
				{(stack) => (
					<div class="border-t border-danger-low-border">
						<div class="flex items-center justify-between gap-3 px-4 py-2">
							<button
								type="button"
								class="flex items-center gap-2 text-sm text-body transition-colors hover:text-title"
								aria-expanded={stackOpen()}
								onClick={() => setStackOpen((open) => !open)}
							>
								<TbOutlineChevronDown
									size={10}
									class={classNames("transition-transform", {
										"-rotate-90": !stackOpen(),
									})}
								/>
								{T()("jobs.error.stack")}
							</button>
							<Copy.Button
								value={stack()}
								label={T()("jobs.error.stack.copy")}
								class="text-xs"
							/>
						</div>
						<Show when={stackOpen()}>
							<pre class="max-h-80 overflow-auto border-t border-danger-low-border bg-background p-4 font-mono text-xs whitespace-pre text-body">
								{stack()}
							</pre>
						</Show>
					</div>
				)}
			</Show>
		</div>
	);
};

export default JobErrorCard;
