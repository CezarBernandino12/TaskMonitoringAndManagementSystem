const { useEffect, useMemo, useState } = React;

function LoginPage() {
	const [showPassword, setShowPassword] = useState(false);
	const [activeSlide, setActiveSlide] = useState(0);
	const [errorMessage, setErrorMessage] = useState('');
	const [email, setEmail] = useState('');
	const [password, setPassword] = useState('');
	const [rememberEmail, setRememberEmail] = useState(false);
	const [touched, setTouched] = useState({
		email: false,
		password: false
	});
	const [isSubmitting, setIsSubmitting] = useState(false);

	const slides = [
		{
			title: 'Organize every task clearly.',
			text: 'Plan, assign, and monitor work in one centralized task management system.'
		},
		{
			title: 'Track progress with confidence.',
			text: 'Stay updated on schedules, reports, inspections, and team responsibilities.'
		},
		{
			title: 'Improve coordination across teams.',
			text: 'Build a smoother workflow with better visibility, accountability, and communication.'
		}
	];

	const isValidEmail = useMemo(() => {
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
	}, [email]);

	const emailError = touched.email && email !== '' && !isValidEmail
		? 'Please enter a valid email address.'
		: '';

	const passwordError = touched.password && password === ''
		? 'Password is required.'
		: '';

	const canSubmit = isValidEmail && password.length > 0 && !isSubmitting;

	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		const error = params.get('error');

		if (error === 'invalid') {
			setErrorMessage('Invalid email or password.');
		}

		if (error === 'missing') {
			setErrorMessage('Please enter both email and password.');
		}

		const savedEmail = localStorage.getItem('prism_saved_email');

		if (savedEmail) {
			setEmail(savedEmail);
			setRememberEmail(true);
		}
	}, []);

	useEffect(() => {
		const timer = setInterval(() => {
			setActiveSlide((current) => (current + 1) % slides.length);
		}, 4500);

		return () => clearInterval(timer);
	}, [slides.length]);

	function handleSubmit(event) {
		setTouched({
			email: true,
			password: true
		});

		if (!isValidEmail || password.length === 0) {
			event.preventDefault();
			setErrorMessage('Please check your email and password.');
			return;
		}

		if (rememberEmail) {
			localStorage.setItem('prism_saved_email', email);
		} else {
			localStorage.removeItem('prism_saved_email');
		}

		setErrorMessage('');
		setIsSubmitting(true);
	}

	return (
		<div className="login-shell">

			<section className="hero-panel">
				<div className="dot-pattern dot-top"></div>
				<div className="dot-pattern dot-bottom"></div>

				<div className="hero-glow hero-glow-top"></div>
				<div className="hero-glow hero-glow-bottom"></div>

				<div className="hero-inner">
					<div className="system-identity">
						<div className="system-name">PRISM</div>
						<div className="system-subtext">
							PLANNING, REPORTING, INSPECTION, SCHEDULING, and MONITORING
						</div>
						<div className="system-subtitle">
							Precision in planning, power in monitoring.
						</div>
					</div>

					<div className="hero-main">
						<h1>Task Management System</h1>

						<p className="hero-description">
							Manage assignments, monitor progress, and keep your team aligned through a smarter workflow.
						</p>

						<ul className="feature-list">
							<li>
								<span><i className="bi bi-kanban"></i></span>
								Task Tracking
							</li>
							<li>
								<span><i className="bi bi-calendar-check"></i></span>
								Scheduling
							</li>
							<li>
								<span><i className="bi bi-clipboard-data"></i></span>
								Reporting
							</li>
							<li>
								<span><i className="bi bi-search"></i></span>
								Inspection Monitoring
							</li>
							<li>
								<span><i className="bi bi-people"></i></span>
								Team Coordination
							</li>
						</ul>
					</div>

					<div className="text-carousel-area">
						<div className="text-carousel">
							{slides.map((slide, index) => (
								<div
									key={index}
									className={`text-slide ${activeSlide === index ? 'is-active' : ''}`}
								>
									<h3>{slide.title}</h3>
									<p>{slide.text}</p>
								</div>
							))}
						</div>

						<div className="carousel-dots">
							{slides.map((_, index) => (
								<button
									key={index}
									type="button"
									className={`carousel-dot ${activeSlide === index ? 'is-active' : ''}`}
									aria-label={`Go to message ${index + 1}`}
									onClick={() => setActiveSlide(index)}
								></button>
							))}
						</div>
					</div>
				</div>
			</section>

			<section className="form-panel">
				<div className="company-header">
					<div className="company-brand">
						<img src="../imgs/PSI.png" alt="PSI Logo" />
						<span>Psy Systems and Innovations, OPC</span>
					</div>
				</div>

				<div className="form-wrap">
					{errorMessage && (
						<div className="login-alert dynamic-alert" role="alert">
							<i className="bi bi-exclamation-circle"></i>
							<span>{errorMessage}</span>
						</div>
					)}

					<form
						action="php/login.php"
						method="POST"
						className="login-form"
						autoComplete="on"
						onSubmit={handleSubmit}
					>
						<div className={`input-group dynamic-field ${email ? 'has-value' : ''} ${emailError ? 'has-error' : ''}`}>
							<label htmlFor="email">Email address</label>

							<div className="input-wrap">
								<i className="bi bi-envelope"></i>

								<input
									type="email"
									id="email"
									name="email"
									placeholder="Enter your email"
									autoComplete="email"
									value={email}
									onChange={(e) => {
										setEmail(e.target.value);
										if (errorMessage) setErrorMessage('');
									}}
									onBlur={() => setTouched((prev) => ({ ...prev, email: true }))}
									required
								/>

								{email && (
									<span className={`status-icon ${isValidEmail ? 'valid' : 'invalid'}`}>
										<i className={`bi ${isValidEmail ? 'bi-check-circle-fill' : 'bi-x-circle-fill'}`}></i>
									</span>
								)}
							</div>

							{emailError && <div className="field-error">{emailError}</div>}
						</div>

						<div className={`input-group dynamic-field ${password ? 'has-value' : ''} ${passwordError ? 'has-error' : ''}`}>
							<label htmlFor="password">Password</label>

							<div className="input-wrap">
								<i className="bi bi-lock"></i>

								<input
									type={showPassword ? 'text' : 'password'}
									id="password"
									name="password"
									placeholder="Enter your password"
									autoComplete="current-password"
									value={password}
									onChange={(e) => {
										setPassword(e.target.value);
										if (errorMessage) setErrorMessage('');
									}}
									onBlur={() => setTouched((prev) => ({ ...prev, password: true }))}
									required
								/>

								<button
									type="button"
									className="password-toggle"
									aria-label={showPassword ? 'Hide password' : 'Show password'}
									aria-pressed={showPassword}
									onClick={() => setShowPassword(!showPassword)}
								>
									<i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
								</button>
							</div>

							{passwordError && <div className="field-error">{passwordError}</div>}
						</div>

						<div className="form-options">
							<label className="remember-check">
								<input
									type="checkbox"
									checked={rememberEmail}
									onChange={(e) => setRememberEmail(e.target.checked)}
								/>
								<span></span>
								Remember email
							</label>
						</div>

						<button
							type="submit"
							className={`login-btn ${isSubmitting ? 'is-loading' : ''}`}
							disabled={!canSubmit}
						>
							{isSubmitting ? (
								<>
									<span className="spinner"></span>
									Signing in
								</>
							) : (
								'Sign In'
							)}
						</button>
					</form>
				</div>
			</section>

		</div>
	);
}

const rootElement = document.getElementById('login-root');

if (rootElement) {
	const root = ReactDOM.createRoot(rootElement);
	root.render(<LoginPage />);
}