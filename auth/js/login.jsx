const { useState } = React;

function PasswordToggle() {
	const [showPassword, setShowPassword] = useState(false);
	const [password, setPassword] = useState("");

	return (
		<div className="floating-field password-field">
			<i className="bi bi-lock field-icon left"></i>

			<input
				type={showPassword ? "text" : "password"}
				id="password"
				name="password"
				placeholder=" "
				autoComplete="current-password"
				value={password}
				onChange={(e) => setPassword(e.target.value)}
				required
			/>

			<label htmlFor="password">Password</label>

			<button
				type="button"
				className="eye-btn"
				onClick={() => setShowPassword(!showPassword)}
				aria-label={showPassword ? "Hide password" : "Show password"}
			>
				<i className={`bi ${showPassword ? "bi-eye-slash" : "bi-eye"}`}></i>
			</button>
		</div>
	);
}

const mountNode = document.getElementById("password-toggle-root");

if (mountNode) {
	const root = ReactDOM.createRoot(mountNode);
	root.render(<PasswordToggle />);
}