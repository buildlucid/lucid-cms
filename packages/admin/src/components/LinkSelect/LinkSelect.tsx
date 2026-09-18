import type { ErrorResult, FieldError, LinkResValue } from "@types";
import classNames from "classnames";
import {
	FaSolidArrowUpRightFromSquare,
	FaSolidPen,
	FaSolidXmark,
} from "solid-icons/fa";
import { type Component, createMemo, Show } from "solid-js";
import Button from "@/components/Button/Button";
import { FieldFeedback } from "@/components/FieldFeedback/FieldFeedback";
import { FormLabel } from "@/components/FormLabel/FormLabel";
import pageBuilderModalsStore from "@/store/pageBuilderModalsStore/pageBuilderModalsStore";
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
	hideOptionalText?: boolean;
}

export const LinkSelect: Component<LinkSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const openLinkModal = () => {
		pageBuilderModalsStore.open("linkSelect", {
			data: {
				selectedLink: props.value ?? null,
			},
			onCallback: (link) => {
				props.onChange(link);
			},
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

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-3 last:mb-0": props.noMargin !== true,
			})}
		>
			<FormLabel
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
				localised={props.localised}
				fieldColumnIsMissing={props.fieldColumnIsMissing}
				hideOptionalText={props.hideOptionalText}
			/>
			<div class="w-full">
				<Show when={hasLink()}>
					<div class="group w-full flex items-center justify-between gap-3 bg-input-base border border-border rounded-md px-3 py-2 group">
						<div class="flex flex-col gap-0.5">
							<Show when={linkLabel()}>
								<span class="text-sm font-medium text-subtitle truncate leading-tight">
									{linkLabel()}
								</span>
							</Show>
							<Show when={linkUrl()}>
								<a
									href={linkUrl() ?? undefined}
									target="_blank"
									rel="noreferrer"
									class={classNames(
										"text-body inline-flex items-center gap-2 min-w-0",
										{
											"font-medium text-subtitle text-sm": !linkLabel(),
											"text-xs": linkLabel(),
										},
									)}
								>
									<span class="truncate">{linkUrl() ?? ""}</span>
									<FaSolidArrowUpRightFromSquare />
								</a>
							</Show>
						</div>

						<div class="flex items-center gap-0.5 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity duration-200">
							<Button
								type="button"
								variant="secondary-subtle"
								size="xs"
								shape="square"
								onClick={openLinkModal}
								disabled={props.disabled}
							>
								<FaSolidPen size={12} />
								<span class="sr-only">{T()("common.edit")}</span>
							</Button>
							<Button
								type="button"
								variant="danger-subtle"
								size="xs"
								shape="square"
								onClick={() => props.onChange(null)}
								disabled={props.disabled}
							>
								<FaSolidXmark size={14} />
								<span class="sr-only">{T()("common.clear")}</span>
							</Button>
						</div>
					</div>
				</Show>

				<Show when={!hasLink()}>
					<Button
						type="button"
						variant="outline"
						size="sm"
						onClick={openLinkModal}
						disabled={props.disabled}
					>
						{T()("selectors.link")}
					</Button>
				</Show>
			</div>
			<FieldFeedback
				id={props.id}
				describedBy={props.copy?.describedBy}
				errors={props.errors}
			/>
		</div>
	);
};
