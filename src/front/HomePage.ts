import van from "vanjs-core";

const { div, h1, p, button } = van.tags;

const HomePage = () =>
	div(
		{ class: "md3-container" },
		div(
			{ class: "md3-top-app-bar" },
			h1({ class: "md3-top-app-bar-title" }, "Welcome to Receiptify!"),
		),
		div(
			{ class: "md3-card md3-card-elevated" },
			p("Upload your receipts and manage your expenses with ease."),
			div(
				{ style: "margin-top: 24px; display: flex; gap: 16px;" },
				button(
					{
						class: "md3-button",
						onclick: () => {
							window.location.hash = "#/login";
						},
					},
					"Login",
				),
				button(
					{
						class: "md3-button md3-button-text",
						onclick: () => {
							window.location.hash = "#/dashboard";
						},
					},
					"View Dashboard",
				),
			),
		),
	);

export default HomePage;
