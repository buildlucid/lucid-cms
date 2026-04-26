const emailConstants = Object.freeze({
	renderedOutput: "email-templates.json",
	assets: {
		logo: "/lucid/assets/email-logo.svg",
	},
	locations: {
		resetPassword: "/lucid/reset-password",
		acceptInvitation: "/lucid/accept-invitation",
		emailChangeConfirm: "/lucid/email-change/confirm",
		emailChangeRevert: "/lucid/email-change/revert",
	},
	storage: {
		defaultPreviewFallback: "[REDACTED]",
		encryptedValueMarker: "__lucid_email_encrypted",
		encryptedValueVersion: 1,
		millisecondsInDay: 24 * 60 * 60 * 1000,
	},
	templates: {
		resetPassword: {
			key: "reset-password",
			external: false,
			storage: {
				resetLink: {
					redact: true,
				},
			},
		},
		userInvite: {
			key: "user-invite",
			external: false,
			storage: {
				inviteLink: {
					redact: true,
				},
			},
		},
		passwordResetSuccess: {
			key: "password-reset-success",
			external: false,
			storage: null,
		},
		emailChanged: {
			key: "email-changed",
			external: false,
			storage: null,
		},
		emailChangeConfirm: {
			key: "email-change-confirm",
			external: false,
			storage: {
				confirmLink: {
					redact: true,
				},
			},
		},
		emailChangeRevert: {
			key: "email-change-revert",
			external: false,
			storage: {
				revertLink: {
					redact: true,
				},
			},
		},
	},
} as const);

export default emailConstants;
