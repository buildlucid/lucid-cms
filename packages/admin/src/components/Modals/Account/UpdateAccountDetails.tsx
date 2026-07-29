import type { User } from "@types";
import {
	type Component,
	createEffect,
	createMemo,
	createSignal,
	Show,
} from "solid-js";
import { Input } from "@/components/Groups/Form";
import { Modal, ModalFooter } from "@/components/Groups/Modal";
import Button from "@/components/Partials/Button";
import ErrorMessage from "@/components/Partials/ErrorMessage";
import PendingEmailChangeNotice from "@/components/Partials/PendingEmailChangeNotice";
import api from "@/services/api";
import T from "@/translations";
import { getBodyError } from "@/utils/error-helpers";
import helpers from "@/utils/helpers";

interface UpdateAccountDetailsProps {
	state: {
		open: boolean;
		setOpen: (_open: boolean) => void;
	};
	data: {
		firstName?: string;
		lastName?: string;
		username?: string;
		email?: string;
		pendingEmailChange?: User["pendingEmailChange"];
	};
	emailChange: {
		isLoading: boolean;
		onCancel: () => void;
	};
}

const UpdateAccountDetails: Component<UpdateAccountDetailsProps> = (props) => {
	// ----------------------------------------
	// State
	const [firstName, setFirstName] = createSignal(props.data.firstName);
	const [lastName, setLastName] = createSignal(props.data.lastName);
	const [username, setUsername] = createSignal(props.data.username ?? "");
	const [email, setEmail] = createSignal(props.data.email ?? "");

	// ----------------------------------------
	// Mutations
	const updateMe = api.account.useUpdateMe({
		onSuccess: () => {
			props.state.setOpen(false);
		},
	});

	// ----------------------------------------
	// Memos
	const updateData = createMemo(() => {
		return helpers.updateData(
			{
				firstName: props.data.firstName,
				lastName: props.data.lastName,
				username: props.data.username,
				email: props.data.email,
			},
			{
				firstName: firstName(),
				lastName: lastName(),
				username: username(),
				email: email(),
			},
		);
	});
	const submitIsDisabled = createMemo(() => !updateData().changed);

	// ----------------------------------------
	// Effects
	createEffect(() => {
		if (!props.state.open) return;

		setFirstName(props.data.firstName);
		setLastName(props.data.lastName);
		setUsername(props.data.username ?? "");
		setEmail(props.data.email ?? "");
		updateMe.reset();
	});

	// ----------------------------------------
	// Handlers
	const closeModal = () => {
		props.state.setOpen(false);
		updateMe.reset();
	};

	// ----------------------------------------
	// Render
	return (
		<Modal
			state={{
				open: props.state.open,
				setOpen: props.state.setOpen,
			}}
			options={{
				noPadding: true,
			}}
		>
			<form
				class="w-full"
				onSubmit={(event) => {
					event.preventDefault();
					updateMe.action.mutate(updateData().data);
				}}
			>
				<div class="p-4 md:p-6">
					{/* Header */}
					<div class="mb-5">
						<h2 class="text-base font-semibold text-title">
							{T()("account.details.edit.title")}
						</h2>
						<p class="mt-1 text-sm text-body">
							{T()("account.details.edit.description")}
						</p>
					</div>

					{/* Fields */}
					<div class="grid grid-cols-1 gap-4 md:grid-cols-2">
						<Input
							id="account-first-name"
							name="firstName"
							type="text"
							value={firstName() ?? ""}
							onChange={setFirstName}
							copy={{
								label: T()("common.first.name"),
							}}
							errors={getBodyError("firstName", updateMe.errors)}
							noMargin={true}
						/>
						<Input
							id="account-last-name"
							name="lastName"
							type="text"
							value={lastName() ?? ""}
							onChange={setLastName}
							copy={{
								label: T()("common.last.name"),
							}}
							errors={getBodyError("lastName", updateMe.errors)}
							noMargin={true}
						/>
					</div>
					<div class="mt-4">
						<Input
							id="account-username"
							name="username"
							type="text"
							value={username()}
							onChange={setUsername}
							copy={{
								label: T()("common.username"),
							}}
							required={true}
							errors={getBodyError("username", updateMe.errors)}
							noMargin={true}
						/>
					</div>
					<div class="mt-4">
						<Input
							id="account-email"
							name="email"
							type="email"
							value={email()}
							onChange={setEmail}
							copy={{
								label: T()("common.email"),
							}}
							required={true}
							errors={getBodyError("email", updateMe.errors)}
							noMargin={true}
						/>
						<p class="mt-2 text-xs text-body">
							{T()("account.email.change.edit.description")}
						</p>
					</div>

					{/* Pending email change */}
					<Show when={props.data.pendingEmailChange}>
						{(pendingEmailChange) => (
							<div class="mt-4">
								<PendingEmailChangeNotice
									email={pendingEmailChange().email}
									isLoading={props.emailChange.isLoading}
									onCancel={props.emailChange.onCancel}
								/>
							</div>
						)}
					</Show>

					{/* Error */}
					<ErrorMessage
						theme="basic"
						message={updateMe.errors()?.message}
						classes="mt-4"
					/>
				</div>

				{/* Footer */}
				<ModalFooter>
					<div />
					<div class="flex gap-2.5">
						<Button
							type="button"
							theme="border-outline"
							size="medium"
							disabled={updateMe.action.isPending}
							onClick={closeModal}
						>
							{T()("common.cancel")}
						</Button>
						<Button
							type="submit"
							theme="primary"
							size="medium"
							loading={updateMe.action.isPending}
							disabled={submitIsDisabled()}
						>
							{T()("common.update")}
						</Button>
					</div>
				</ModalFooter>
			</form>
		</Modal>
	);
};

export default UpdateAccountDetails;
