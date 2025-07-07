import T from "@/translations";
import { type Component, Match, Switch } from "solid-js";
import classNames from "classnames";
import { FaSolidPen, FaSolidXmark } from "solid-icons/fa";
import type { ErrorResult, FieldError, LinkResValue } from "@types";
import linkFieldStore from "@/store/forms/linkFieldStore";
import Button from "@/components/Partials/Button";
import { Label, DescribedBy, ErrorMessage } from "@/components/Groups/Form";

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
	const linkLabel = () => {
		const value = props.value as LinkResValue;
		return value?.label || value?.url;
	};

	// -------------------------------
	// Render
	return (
		<div
			class={classNames("w-full", {
				"mb-0": props.noMargin,
				"mb-2.5 last:mb-0": !props.noMargin,
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
			<div class="mt-2.5 w-full flex flex-wrap gap-2.5">
				<Switch>
					<Match when={!linkLabel()}>
						<Button
							type="button"
							theme="secondary"
							size="x-small"
							onClick={openLinkModal}
							disabled={props.disabled}
						>
							{T()("select_link")}
						</Button>
					</Match>
					<Match when={props.value}>
						<div class="w-full flex items-center gap-2.5">
							<Button
								type="button"
								theme="secondary"
								size="x-small"
								onClick={openLinkModal}
								disabled={props.disabled}
								classes="capitalize"
							>
								<span class="line-clamp-1">{linkLabel()}</span>
								<span class="ml-2.5 flex items-center border-l border-current pl-2.5">
									<FaSolidPen size={12} class="text-current" />
								</span>
							</Button>
							<Button
								type="button"
								theme="input-style"
								size="x-icon"
								onClick={() => {
									props.onChange(null);
								}}
								disabled={props.disabled}
								classes="capitalize"
							>
								<FaSolidXmark />
								<span class="sr-only">{T()("clear")}</span>
							</Button>
						</div>
					</Match>
				</Switch>
			</div>
			<DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
