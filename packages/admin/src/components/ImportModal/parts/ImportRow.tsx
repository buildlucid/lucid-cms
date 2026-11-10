import {
	TbOutlineAlertTriangle,
	TbOutlineCheck,
	TbOutlineFileText,
	TbOutlinePhoto,
} from "solid-icons/tb";
import { type Component, For, Match, Show, Switch } from "solid-js";
import Button from "@/components/Button/Button";
import Link from "@/components/Link/Link";
import Pill, { type PillVariant } from "@/components/Pill/Pill";
import ProgressBar from "@/components/ProgressBar/ProgressBar";
import Spinner from "@/components/Spinner/Spinner";
import T from "@/translations";

/** A failure shown under a row, eg. one of a group's files with its own retry. */
export type ImportRowError = {
	label?: string;
	message: string;
	onRetry?: () => void;
};

export interface ImportRowProps {
	label: string;
	subtitle: string;
	icon: "document" | "media";
	status: { label: string; variant: PillVariant; tooltip?: string };
	/** Shows a spinner while the row is being imported. */
	busy?: boolean;
	/** Upload or group progress from 0 to 100. */
	progress?: number;
	done?: boolean;
	failed?: boolean;
	warnings?: string[];
	errors?: ImportRowError[];
	/** Opens the imported record. */
	href?: string;
	onRetry?: () => void;
}

/** One entry, or a group of media files, in the import list with its planned or actual outcome. */
export const ImportRow: Component<ImportRowProps> = (props) => {
	// ----------------------------------------
	// Render
	return (
		<li class="relative px-3 py-2.5">
			<div class="flex items-center gap-3">
				<span class="flex size-8 shrink-0 items-center justify-center rounded-md bg-input text-icon">
					<Switch
						fallback={
							props.icon === "media" ? (
								<TbOutlinePhoto size={16} />
							) : (
								<TbOutlineFileText size={16} />
							)
						}
					>
						<Match when={props.busy}>
							<Spinner size="xs" />
						</Match>
						<Match when={props.failed}>
							<TbOutlineAlertTriangle size={16} class="text-danger" />
						</Match>
						<Match when={props.done}>
							<TbOutlineCheck size={16} class="text-success" />
						</Match>
					</Switch>
				</span>
				<div class="min-w-0 flex-1">
					<p class="truncate text-sm font-medium text-subtitle">
						{props.label}
					</p>
					<p class="truncate text-xs text-body">{props.subtitle}</p>
				</div>
				<div class="flex shrink-0 items-center gap-1.5">
					<Show when={props.onRetry}>
						{(retry) => (
							<Button type="button" variant="ghost" size="xs" onClick={retry()}>
								{T()("common.retry")}
							</Button>
						)}
					</Show>
					<Show when={props.href}>
						{(href) => (
							<Link href={href()} variant="ghost" size="xs">
								{T()("common.open")}
							</Link>
						)}
					</Show>
					<Pill variant={props.status.variant} tooltip={props.status.tooltip}>
						{props.status.label}
					</Pill>
				</div>
			</div>
			<Show when={(props.errors?.length ?? 0) > 0}>
				<ul class="mt-2 ml-11 flex flex-col gap-1 rounded-md border border-danger-low-border bg-danger-low px-2.5 py-1.5">
					<For each={props.errors}>
						{(error) => (
							<li class="flex items-center justify-between gap-2 text-xs text-danger-low-foreground">
								<span class="min-w-0">
									<Show when={error.label}>
										<span class="font-medium">{error.label}</span>
										{": "}
									</Show>
									{error.message}
								</span>
								<Show when={error.onRetry}>
									{(retry) => (
										<Button
											type="button"
											variant="ghost"
											size="xs"
											onClick={retry()}
										>
											{T()("common.retry")}
										</Button>
									)}
								</Show>
							</li>
						)}
					</For>
				</ul>
			</Show>
			<Show when={(props.warnings?.length ?? 0) > 0}>
				<ul class="mt-2 ml-11 flex flex-col gap-1 rounded-md border border-warning-low-border bg-warning-low px-2.5 py-1.5">
					<For each={props.warnings}>
						{(warning) => (
							<li class="text-xs text-warning-low-foreground">{warning}</li>
						)}
					</For>
				</ul>
			</Show>
			<Show when={props.progress !== undefined && props.busy}>
				<div class="absolute right-0 bottom-0 left-0">
					<ProgressBar
						value={props.progress ?? 0}
						variant="primary-subtle"
						size="sm"
						square
					/>
				</div>
			</Show>
		</li>
	);
};
