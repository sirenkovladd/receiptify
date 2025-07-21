import van from "vanjs-core";
const { div, h1, p } = van.tags;

const HomePage = () =>
	div(
		h1("Welcome to Receiptify!"),
		p("Upload your receipts and manage your expenses with ease."),
	);

export default HomePage;
