import T from "@/translations";
import { type Component, Match, Switch } from "solid-js";
import classNames from "classnames";
import { FaSolidXmark, FaSolidPen } from "solid-icons/fa";
import type {
	ErrorResult,
	FieldErrors,
	CollectionDocumentResponse,
} from "@lucidcms/core/types";
import documentSelectStore from "@/store/forms/documentSelectStore";
import Button from "@/components/Partials/Button";
import Form from "@/components/Groups/Form";

interface DocumentSelectProps {
	id: string;
	collection: string;
	value: number | undefined;
	onChange: (_value: number | null) => void;
	copy?: {
		label?: string;
		describedBy?: string;
	};
	disabled?: boolean;
	noMargin?: boolean;
	required?: boolean;
	errors?: ErrorResult | FieldErrors;
	altLocaleError?: boolean;
}

export const DocumentSelect: Component<DocumentSelectProps> = (props) => {
	// -------------------------------
	// Functions
	const openDocuSelectModal = () => {
		documentSelectStore.set({
			onSelectCallback: (doc: CollectionDocumentResponse) => {
				props.onChange(doc.id);
			},
			open: true,
			collectionKey: props.collection,
			selected: props.value,
		});
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
			<Form.Label
				id={props.id}
				label={props.copy?.label}
				required={props.required}
				theme={"basic"}
				altLocaleError={props.altLocaleError}
			/>
			<div class="mt-2.5 w-full">
				<Switch>
					<Match when={typeof props.value !== "number"}>
						<Button
							type="button"
							theme="secondary"
							size="x-small"
							onClick={openDocuSelectModal}
							disabled={props.disabled}
							classes="capitalize"
						>
							{T()("select_document")}
						</Button>
					</Match>
					<Match when={typeof props.value === "number"}>
						<div class="w-full flex items-center gap-2.5">
							<Button
								type="button"
								theme="secondary"
								size="x-small"
								onClick={openDocuSelectModal}
								disabled={props.disabled}
								classes="capitalize"
							>
								<span class="line-clamp-1">
									{T()("selected_document", {
										id: props.value,
									})}
								</span>
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
			<Form.DescribedBy id={props.id} describedBy={props.copy?.describedBy} />
			<Form.ErrorMessage id={props.id} errors={props.errors} />
		</div>
	);
};
