const { useState } = React;

function PasswordToggle() {
	const [showPassword, setShowPassword] = useState(false);
	const [password, setPassword]         = useState('');

	return (
		<div className="floating-field password-field" style={{ marginBottom: '18px' }}>
			<i className="bi bi-lock field-icon"></i>

			<input
				type={showPassword ? 'text' : 'password'}
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
				aria-label={showPassword ? 'Hide password' : 'Show password'}
			>
				<i className={`bi ${showPassword ? 'bi-eye-slash' : 'bi-eye'}`}></i>
			</button>
		</div>
	);
}

const mountNode = document.getElementById('password-toggle-root');
if (mountNode) {
	const root = ReactDOM.createRoot(mountNode);
	root.render(<PasswordToggle />);
}


(function () {
	const track  = document.getElementById('carouselTrack');
	const slides = Array.from(track.querySelectorAll('.carousel-slide'));
	const dotsContainer = document.getElementById('carouselDots');

	let current = 0;
	let timer;

	slides.forEach((_, i) => {
		const dot = document.createElement('button');
		dot.className = 'carousel-dot' + (i === 0 ? ' is-active' : '');
		dot.setAttribute('aria-label', `Go to slide ${i + 1}`);
		dot.addEventListener('click', () => goTo(i));
		dotsContainer.appendChild(dot);
	});

	function goTo(index) {
		slides[current].classList.remove('is-active');
		dotsContainer.children[current].classList.remove('is-active');

		current = index;

		slides[current].classList.add('is-active');
		dotsContainer.children[current].classList.add('is-active');
		track.style.transform = `translateX(-${current * 100}%)`;

		resetTimer();
	}

	function next() {
		goTo((current + 1) % slides.length);
	}

	function resetTimer() {
		clearInterval(timer);
		timer = setInterval(next, 5000);
	}

	resetTimer();
})();