// Login functionality for Apple Explorer
class LoginManager {
    constructor() {
        this.init();
        this.userEmail = '';
    }

    init() {
        this.bindEvents();
        this.checkIfAlreadyLoggedIn();
    }

    bindEvents() {
        // Login form submission
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        // Verification form submission (for unverified users)
        const verificationForm = document.getElementById('verification-form');
        if (verificationForm) {
            verificationForm.addEventListener('submit', (e) => this.handleVerification(e));
        }

        // Resend verification code
        const resendButton = document.getElementById('resend-code');
        if (resendButton) {
            resendButton.addEventListener('click', () => this.resendVerificationCode());
        }

        // Toggle password visibility
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Auto-format verification code input
        const verificationCodeInput = document.getElementById('verificationCode');
        if (verificationCodeInput) {
            verificationCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }
    }

    checkIfAlreadyLoggedIn() {
        const token = localStorage.getItem('authToken');
        const user = localStorage.getItem('user');
        
        if (token && user) {
            // Verify token is still valid
            this.verifyToken(token).then(isValid => {
                if (isValid) {
                    // Check if there's a redirect URL, otherwise go to dashboard
                    const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'dashboard.html';
                    localStorage.removeItem('redirectAfterLogin');
                    window.location.href = redirectUrl;
                } else {
                    // Token is invalid, clear storage
                    if (window.authManager) {
                        window.authManager.clearAuth();
                    } else {
                        localStorage.removeItem('authToken');
                        localStorage.removeItem('user');
                    }
                }
            });
        }
    }

    async verifyToken(token) {
        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            return response.ok;
        } catch (error) {
            return false;
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.querySelector('#togglePassword i');
        
        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.classList.remove('fa-eye');
            toggleIcon.classList.add('fa-eye-slash');
        } else {
            passwordInput.type = 'password';
            toggleIcon.classList.remove('fa-eye-slash');
            toggleIcon.classList.add('fa-eye');
        }
    }

    showMessage(message, type = 'success', containerId = 'message-container', alertId = 'message-alert') {
        const container = document.getElementById(containerId);
        const alert = document.getElementById(alertId);
        
        if (container && alert) {
            alert.className = `alert alert-${type}`;
            alert.textContent = message;
            container.style.display = 'block';
            
            // Auto-hide success messages after 5 seconds
            if (type === 'success') {
                setTimeout(() => {
                    container.style.display = 'none';
                }, 5000);
            }
        }
    }

    hideMessage(containerId = 'message-container') {
        const container = document.getElementById(containerId);
        if (container) {
            container.style.display = 'none';
        }
    }

    setLoading(isLoading, buttonId, textId, loadingId) {
        const button = document.getElementById(buttonId);
        const text = document.getElementById(textId);
        const loading = document.getElementById(loadingId);

        if (button && text && loading) {
            button.disabled = isLoading;
            text.style.display = isLoading ? 'none' : 'inline';
            loading.style.display = isLoading ? 'inline' : 'none';
        }
    }

    async handleLogin(event) {
        event.preventDefault();
        
        this.hideMessage();
        this.setLoading(true, 'login-button', 'login-text', 'login-loading');

        try {
            const formData = new FormData(event.target);
            const email = formData.get('email').trim().toLowerCase();
            const password = formData.get('password');

            // Client-side validation
            if (!email || !password) {
                throw new Error('Please enter both email and password');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please enter a valid email address');
            }

            // Send login request
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (!data.success) {
                // Check if user needs email verification
                if (data.needsVerification) {
                    this.userEmail = email;
                    this.showVerificationModal();
                    throw new Error(data.message);
                }
                throw new Error(data.message || 'Login failed');
            }

            // Store authentication data using auth manager
            if (window.authManager) {
                window.authManager.setAuth(data.token, data.user);
            } else {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Show success message
            this.showMessage('Login successful! Redirecting...', 'success');

            // Small delay to allow auth manager to handle redirect
            setTimeout(() => {
                // Check if there's a redirect URL, otherwise go to dashboard
                const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'dashboard.html';
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            }, 1000);

        } catch (error) {
            console.error('Login error:', error);
            this.showMessage(error.message || 'Login failed. Please try again.', 'danger');
        } finally {
            this.setLoading(false, 'login-button', 'login-text', 'login-loading');
        }
    }

    showVerificationModal() {
        const verificationModal = new bootstrap.Modal(document.getElementById('verificationModal'));
        verificationModal.show();
        
        // Send a new verification code
        this.resendVerificationCode();
    }

    async handleVerification(event) {
        event.preventDefault();
        
        this.hideMessage('verification-message-container');
        this.setLoading(true, 'verify-button', 'verify-text', 'verify-loading');

        try {
            const formData = new FormData(event.target);
            const verificationCode = formData.get('verificationCode').trim();

            if (!verificationCode || verificationCode.length !== 6) {
                throw new Error('Please enter a valid 6-digit verification code');
            }

            // Send verification request
            const response = await fetch('/api/auth/verify-email', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    code: verificationCode
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Verification failed');
            }

            // Store authentication token using auth manager
            if (window.authManager) {
                window.authManager.setAuth(data.token, data.user);
            } else {
                localStorage.setItem('authToken', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));
            }

            // Show success message
            this.showMessage('Email verified successfully! Redirecting...', 'success', 'verification-message-container', 'verification-message-alert');

            // Redirect after 2 seconds
            setTimeout(() => {
                const redirectUrl = localStorage.getItem('redirectAfterLogin') || 'dashboard.html';
                localStorage.removeItem('redirectAfterLogin');
                window.location.href = redirectUrl;
            }, 2000);

        } catch (error) {
            console.error('Verification error:', error);
            this.showMessage(error.message || 'Verification failed. Please try again.', 'danger', 'verification-message-container', 'verification-message-alert');
        } finally {
            this.setLoading(false, 'verify-button', 'verify-text', 'verify-loading');
        }
    }

    async resendVerificationCode() {
        try {
            if (!this.userEmail) {
                throw new Error('No email address found. Please try logging in again.');
            }

            const response = await fetch('/api/auth/resend-verification', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.userEmail
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to resend verification code');
            }

            this.showMessage('Verification code sent successfully! Please check your email.', 'success', 'verification-message-container', 'verification-message-alert');

        } catch (error) {
            console.error('Resend verification error:', error);
            this.showMessage(error.message || 'Failed to resend verification code. Please try again.', 'danger', 'verification-message-container', 'verification-message-alert');
        }
    }
}

// Initialize login manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new LoginManager();
});
