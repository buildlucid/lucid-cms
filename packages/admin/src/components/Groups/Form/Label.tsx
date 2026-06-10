import classnames from "classnames";
import { FaSolidDatabase, FaSolidGlobe } from "solid-icons/fa";
import { type Component, type JSXElement, Show } from "solid-js";
import T from "@/translations";

interface LabelProps {
	id: string;
	label?: string;
	focused?: boolean;
	required?: boolean;
	theme: "full" | "basic";
	hideOptionalText?: boolean;

	localised?: boolean;
	altLocaleError?: boolean;
	fieldColumnIsMissing?: boolean;
	rightSlot?: JSXElement;
}

export const Label: Component<LabelProps> = (props) => {
	return (
		<Show when={props?.label !== undefined || props.rightSlot !== undefined}>
			<div
				class={classnames(
					"mb-1.5 flex min-w-0 items-center justify-between gap-3 text-sm text-body",
					{
						"pt-2 px-2 mb-0!": props.theme === "full",
					},
				)}
			>
				<Show when={props?.label !== undefined}>
					<label
						for={props.id}
						class={classnames(
							"flex min-w-0 items-center gap-1 transition-colors duration-200 ease-in-out",
							{
								"text-primary-hover!": props.focused,
							},
						)}
					>
						<Show when={props.fieldColumnIsMissing}>
							<span
								class="text-error-base inline"
								title={T()("fields.database.missing")}
							>
								<FaSolidDatabase size={12} />
							</span>
						</Show>
						<Show when={props.localised}>
							<span
								class={classnames("inline", {
									"text-error-base": props.altLocaleError,
								})}
								title={
									props.altLocaleError
										? T()("fields.validation.other.locales.errors")
										: T()("fields.localized.supported")
								}
							>
								<FaSolidGlobe size={12} />
							</span>
						</Show>
						{props?.label}
						<Show when={props.required}>
							<span class="text-error-base inline text-xs">*</span>
						</Show>
					</label>
				</Show>
				<Show when={props?.label === undefined}>
					<span />
				</Show>

				<div class="flex shrink-0 items-center gap-2">
					<Show when={props.rightSlot}>{props.rightSlot}</Show>
					<Show when={!props.required && !props.hideOptionalText}>
						<span class="text-unfocused text-xs">{T()("common.optional")}</span>
					</Show>
				</div>
			</div>
		</Show>
	);
};
