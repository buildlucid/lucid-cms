import type { MediaResponse } from "@types";
import classNames from "classnames";
import { type Accessor, type Component, createMemo, Show } from "solid-js";
import ActionDropdown from "@/components/Partials/ActionDropdown";
import AspectRatio from "@/components/Partials/AspectRatio";
import MediaPreview from "@/components/Partials/MediaPreview";
import type useRowTarget from "@/hooks/useRowTarget";
import userStore from "@/store/userStore";
import T from "@/translations";
import helpers from "@/utils/helpers";

interface MediaBasicCardProps {
	media: MediaResponse;
	current: boolean;
	contentLocale?: string;
	onClick?: () => void;
	rowTarget?: ReturnType<typeof useRowTarget<"clear" | "restore">>;
	showingDeleted?: Accessor<boolean>;
}

export const MediaBasicCardLoading: Component = () => {
	// ----------------------------------
	// Return
	return (
		<li class={"bg-background-base border-border border rounded-md"}>
			<AspectRatio ratio="16:9">
				<span class="skeleton block w-full h-full rounded-b-none" />
			</AspectRatio>
			<div class="p-2.5">
				<span class="skeleton block h-5 w-1/2 mb-2" />
				<span class="skeleton block h-5 w-full" />
			</div>
		</li>
	);
};

const MediaBasicCard: Component<MediaBasicCardProps> = (props) => {
	// ----------------------------------
	// Memos
	const hasUpdatePermission = createMemo(() => {
		return userStore.get.hasPermission(["update_media"]).all;
	});
	const title = createMemo(() => {
		return helpers.getTranslation(props.media.title, props.contentLocale);
	});
	const alt = createMemo(() => {
		return helpers.getTranslation(props.media.alt, props.contentLocale);
	});
	const showRestore = createMemo(() => props.showingDeleted?.() === true);

	// ----------------------------------
	// Return
	return (
		<li
			class={classNames(
				"bg-card-base border-border border rounded-md group overflow-hidden relative cursor-pointer transition-colors",
				{
					"border-primary-base bg-primary-muted-bg ring-1 ring-primary-muted-border":
						props.current,
				},
			)}
			onClick={() => {
				props.onClick?.();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") {
					props.onClick?.();
				}
			}}
		>
			<Show when={props.rowTarget !== undefined}>
				<div class="absolute top-3 right-3 z-30 opacity-0 group-hover:opacity-100">
					<ActionDropdown
						actions={[
							{
								label: T()("restore"),
								type: "button",
								onClick: () => {
									props.rowTarget?.setTargetId(props.media.id);
									props.rowTarget?.setTrigger("restore", true);
								},
								permission: hasUpdatePermission(),
								hide: showRestore() === false,
								theme: "primary",
							},
							{
								label: T()("clear_processed"),
								type: "button",
								onClick: () => {
									props.rowTarget?.setTargetId(props.media.id);
									props.rowTarget?.setTrigger("clear", true);
								},
								hide: props.media.type !== "image",
								permission: hasUpdatePermission(),
								theme: "error",
							},
						]}
						options={{
							border: true,
						}}
					/>
				</div>
			</Show>
			{/* Image */}
			<AspectRatio
				ratio="16:9"
				innerClass={classNames("overflow-hidden", {
					"rectangle-background": props.media.type === "image",
				})}
			>
				<MediaPreview
					media={props.media}
					alt={alt() || title() || ""}
					imageFit={props.media.type === "image" ? "contain" : undefined}
				/>
			</AspectRatio>
			{/* Content */}
			<div class="p-2 border-t border-border">
				<h3 class="line-clamp-1 text-sm">{title() || T()("no_translation")}</h3>
			</div>
		</li>
	);
};

export default MediaBasicCard;
