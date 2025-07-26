import van from "vanjs-core";

const { div, h1, p } = van.tags;
const NotFoundPage = () =>
	div(
		{ class: "md3-container" },
		div(
			{ class: "md3-top-app-bar" },
			h1({ class: "md3-top-app-bar-title" }, "404 - Page Not Found"),
		),
		div(
			{ class: "md3-card md3-card-elevated" },
			p("The page you're looking for doesn't exist."),
			button(
				{
					class: "md3-button",
					onclick: () => {
						window.location.hash = "#/";
					},
				},
				"Go Home",
			),
		),
	);
export default NotFoundPage;
