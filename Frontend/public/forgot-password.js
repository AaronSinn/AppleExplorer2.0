// Forgot Password functionality for Apple Explorer
class ForgotPasswordManager {
    constructor() {
        this.userEmail = '';
        this.init();
    }

    init() {
        this.bindEvents();
    }

    bindEvents() {
        // Forgot password form submission
        const forgotForm = document.getElementById('forgot-password-form');
        if (forgotForm) {
            forgotForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        // Reset password form submission
        const resetForm = document.getElementById('reset-password-form');
        if (resetForm) {
            resetForm.addEventListener('submit', (e) => this.handleResetPassword(e));
        }

        // Resend reset code
        const resendButton = document.getElementById('resend-code');
        if (resendButton) {
            resendButton.addEventListener('click', () => this.resendResetCode());
        }

        // Toggle password visibility
        const togglePassword = document.getElementById('togglePassword');
        if (togglePassword) {
            togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
        }

        // Real-time password confirmation validation
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }

        // Auto-format reset code input
        const resetCodeInput = document.getElementById('resetCode');
        if (resetCodeInput) {
            resetCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }
    }

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('newPassword');
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

    validatePasswordMatch() {
        const password = document.getElementById('newPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;
        const confirmPasswordInput = document.getElementById('confirmPassword');

        if (confirmPassword && password !== confirmPassword) {
            confirmPasswordInput.setCustomValidity('Passwords do not match');
            confirmPasswordInput.classList.add('is-invalid');
        } else {
            confirmPasswordInput.setCustomValidity('');
            confirmPasswordInput.classList.remove('is-invalid');
            if (confirmPassword) {
                confirmPasswordInput.classList.add('is-valid');
            }
        }
    }

    showMessage(message, type = 'success') {
        const container = document.getElementById('message-container');
        const alert = document.getElementById('message-alert');
        
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

    hideMessage() {
        const container = document.getElementById('message-container');
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

    showResetStep() {
        const requestStep = document.getElementById('request-step');
        const resetStep = document.getElementById('reset-step');
        
        if (requestStep) requestStep.style.display = 'none';
        if (resetStep) resetStep.style.display = 'block';
    }

    async handleForgotPassword(event) {
        event.preventDefault();
        
        this.hideMessage();
        this.setLoading(true, 'request-button', 'request-text', 'request-loading');

        try {
            const formData = new FormData(event.target);
            const email = formData.get('email').trim().toLowerCase();

            // Client-side validation
            if (!email) {
                throw new Error('Please enter your email address');
            }

            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                throw new Error('Please enter a valid email address');
            }

            // Store email for later use
            this.userEmail = email;

            // Send forgot password request
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to send reset code');
            }

            // Send password reset email via EmailJS if email data is provided
            if (data.emailData && window.emailService) {
                console.log('📧 Sending password reset email via EmailJS...');
                
                if (!window.emailService.isConfigured()) {
                    console.warn('⚠️ EmailJS not configured - showing instructions');
                    window.emailService.showConfigInstructions();
                    
                    // Show the email data in console for development
                    console.log('='.repeat(50));
                    console.log('📧 DEVELOPMENT MODE - RESET EMAIL DATA');
                    console.log('='.repeat(50));
                    console.log(`📧 Email: ${data.emailData.email}`);
                    console.log(`🔢 Reset Code: ${data.emailData.code}`);
                    console.log('⚠️ Configure EmailJS to send real emails');
                    console.log('='.repeat(50));
                } else {
                    // Send real email via EmailJS
                    const emailResult = await window.emailService.sendPasswordResetEmail(data.emailData);
                    if (emailResult.success) {
                        console.log('✅ Password reset email sent successfully');
                    } else {
                        console.error('❌ Failed to send password reset email:', emailResult.error);
                    }
                }
            }

            // Show success message and move to reset step
            this.showMessage('Reset code sent successfully! Please check your email.', 'success');
            
            // Switch to reset step after a short delay
            setTimeout(() => {
                this.showResetStep();
                this.hideMessage();
            }, 2000);

        } catch (error) {
            console.error('Forgot password error:', error);
            this.showMessage(error.message || 'Failed to send reset code. Please try again.', 'danger');
        } finally {
            this.setLoading(false, 'request-button', 'request-text', 'request-loading');
        }
    }

    async handleResetPassword(event) {
        event.preventDefault();
        
        this.hideMessage();
        this.setLoading(true, 'reset-button', 'reset-text', 'reset-loading');

        try {
            const formData = new FormData(event.target);
            const resetCode = formData.get('resetCode').trim();
            const newPassword = formData.get('newPassword');
            const confirmPassword = formData.get('confirmPassword');

            // Client-side validation
            if (!resetCode || resetCode.length !== 6) {
                throw new Error('Please enter a valid 6-digit reset code');
            }

            if (!newPassword || newPassword.length < 6) {
                throw new Error('Password must be at least 6 characters long');
            }

            if (newPassword !== confirmPassword) {
                throw new Error('Passwords do not match');
            }

            // Send reset password request
            const response = await fetch('/api/auth/reset-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: this.userEmail,
                    token: resetCode,
                    newPassword: newPassword
                })
            });

            const data = await response.json();

            if (!data.success) {
                throw new Error(data.message || 'Failed to reset password');
            }

            // Show success message
            this.showMessage('Password reset successfully! Redirecting to login...', 'success');

            // Redirect to login page after 2 seconds
            setTimeout(() => {
                window.location.href = 'LoginPage.html';
            }, 2000);

        } catch (error) {
            console.error('Reset password error:', error);
            this.showMessage(error.message || 'Failed to reset password. Please try again.', 'danger');
        } finally {
            this.setLoading(false, 'reset-button', 'reset-text', 'reset-loading');
        }
    }

    async resendResetCode() {
        try {
            if (!this.userEmail) {
                throw new Error('No email address found. Please start the process again.');
            }

            const response = await fetch('/api/auth/forgot-password', {
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
                throw new Error(data.message || 'Failed to resend reset code');
            }

            this.showMessage('Reset code sent successfully! Please check your email.', 'success');

        } catch (error) {
            console.error('Resend reset code error:', error);
            this.showMessage(error.message || 'Failed to resend reset code. Please try again.', 'danger');
        }
    }
}

// Initialize forgot password manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ForgotPasswordManager();
});
