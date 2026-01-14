import type { ErrorResult, FieldError, LinkResValue } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidLink,
	FaSolidPen,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import { DescribedBy, ErrorMessage, Label } from "@/components/Groups/Form";
import Button from "@/components/Partials/Button";
import linkFieldStore from "@/store/forms/linkFieldStore";
import T from "@/translations";

interface LinkSelectProps {
	id: string;
	value: LinkResValue | undefined;
	onChange: (_value: LinkResValue) => void;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldError;
	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
}

export const LinkSelect: Component<LinkSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const openLinkModal = () => {
		linkFieldStore.set({
			onSelectCallback: (link) => {
				props.onChange(link);
			},
			open: true,
			selectedLink: props.value as LinkResValue,
		});
	};

	// -------------------------------
	// Memos
	const hasLink = createMemo(() => {
		return props.value?.url || props.value?.label;
	});
	const linkLabel = createMemo(() => {
		return props.value?.label;
	});
	const linkUrl = createMemo(() => {
		return props.value?.url;
	});
	const opensInNewTab = createMemo(() => {
		return props.value?.target === "_blank";
	});

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
			/>
			<div class="mt-2 w-full">
				<Show when={hasLink()}>
					<div class="w-full flex items-center justify-between gap-3 bg-input-base border border-border rounded-md px-3 py-2 group">
						<Show when={opensInNewTab()} fallback={<FaSolidLink size={14} />}>
							<FaSolidArrowUpRightFromSquare size={14} />
						</Show>
						<div class="flex-1 min-w-0 flex flex-col gap-0.5">
							<Show when={linkLabel()}>
								<span class="text-sm font-medium text-title truncate leading-tight">
									{linkLabel()}
								</span>
							</Show>
							<Show when={linkUrl()}>
								<span
									class={classNames("text-body truncate leading-tight", {
										"font-medium text-title text-sm": !linkLabel(),
										"text-xs": linkLabel(),
									})}
								>
									{linkUrl()}
								</span>
							</Show>
						</div>

						<div class="flex items-center gap-0.5">
							<Button
								type="button"
								theme="secondary-subtle"
								size="icon-subtle"
								onClick={openLinkModal}
								disabled={props.disabled}
							>
								<FaSolidPen size={12} />
								<span class="sr-only">{T()("edit")}</span>
							</Button>
							<Button
								type="button"
								theme="danger-subtle"
								size="icon-subtle"
								onClick={() => props.onChange(null)}
								disabled={props.disabled}
							>
								<FaSolidXmark size={14} />
								<span class="sr-only">{T()("clear")}</span>
							</Button>
						</div>
					</div>
				</Show>

				<Show when={!hasLink()}>
					<Button
						type="button"
						theme="secondary"
						size="small"
						onClick={openLinkModal}
						disabled={props.disabled}
					>
						{T()("select_link")}
					</Button>
				</Show>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
