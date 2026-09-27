import classnames from "classnames";
import {
	FaSolidArrowRotateLeft,
	FaSolidCode,
	FaSolidMessage,
	FaSolidStop,
} from "solid-icons/fa";
import { type Component, type JSX, Show } from "solid-js";
import Button from "@/components/Button/Button";
import T from "@/translations";

const AgentInteractionBar: Component<{
	id?: string;
	title: JSX.Element;
	onRedirect?: () => void;
	redirecting?: boolean;
	onStop?: () => void;
	/** Shows a button that reveals the data the interaction acts on, such as an approval's input. */
	details?: { open: boolean; onToggle: () => void };
	class?: string;
}> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<div
			class={classnames(
				"flex items-start gap-3 border-b border-primary-low-border bg-primary-low px-4 py-3",
				props.class,
			)}
		>
			<div id={props.id} class="min-w-0 grow text-sm leading-6 text-subtitle">
				{props.title}
			</div>
			<div class="-my-0.5 -me-1.5 flex shrink-0 items-center gap-1">
				<Show when={props.details}>
					{(details) => (
						<Button
							type="button"
							variant="ghost"
							size="xs"
							shape="circle"
							aria-pressed={details().open}
							aria-label={T()(
								details().open
									? "agent.interaction.details.hide"
									: "agent.interaction.details.show",
							)}
							title={T()(
								details().open
									? "agent.interaction.details.hide"
									: "agent.interaction.details.show",
							)}
							onClick={() => details().onToggle()}
						>
							<FaSolidCode size={11} />
						</Button>
					)}
				</Show>
				<Show when={props.onRedirect}>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						shape="circle"
						aria-label={T()(
							props.redirecting
								? "agent.interaction.return"
								: "agent.interaction.redirect",
						)}
						title={T()(
							props.redirecting
								? "agent.interaction.return"
								: "agent.interaction.redirect",
						)}
						onClick={() => props.onRedirect?.()}
					>
						<Show
							when={props.redirecting}
							fallback={<FaSolidMessage size={11} />}
						>
							<FaSolidArrowRotateLeft size={11} />
						</Show>
					</Button>
				</Show>
				<Show when={props.onStop}>
					<Button
						type="button"
						variant="ghost"
						size="xs"
						shape="circle"
						aria-label={T()("agent.question.stop")}
						title={T()("agent.question.stop")}
						onClick={() => props.onStop?.()}
					>
						<FaSolidStop size={10} />
					</Button>
				</Show>
			</div>
		</div>
	);
};

export default AgentInteractionBar;
