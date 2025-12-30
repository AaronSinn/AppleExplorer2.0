// Signup functionality for Apple Explorer
class SignupManager {
    constructor() {
        this.init();
        this.userEmail = '';
    }

    init() {
        this.bindEvents();
        this.setupFormValidation();
    }

    bindEvents() {
        // Signup form submission
        const signupForm = document.getElementById('signup-form');
        if (signupForm) {
            signupForm.addEventListener('submit', async (e) => {
                e.preventDefault(); // Prevent default form submission
                
                // Get form data
                const formData = new FormData(e.target);
                const userData = {
                    fullName: formData.get('fullName'),
                    email: formData.get('email'),
                    password: formData.get('password'),
                    confirmPassword: formData.get('confirmPassword'),
                    role: formData.get('role')
                };
                
                // Validate form
                if (!this.validateForm(userData)) {
                    return;
                }
                
                // Handle signup
                try {
                    await this.handleSignup(userData);
                } catch (error) {
                    this.showMessage(error.message, 'danger');
                }
            });
        }

        // Verification form submission
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

        // Real-time password confirmation validation
        const confirmPassword = document.getElementById('confirmPassword');
        if (confirmPassword) {
            confirmPassword.addEventListener('input', () => this.validatePasswordMatch());
        }

        // Auto-format verification code input
        const verificationCodeInput = document.getElementById('verificationCode');
        if (verificationCodeInput) {
            verificationCodeInput.addEventListener('input', (e) => {
                e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6);
            });
        }
    }

    setupFormValidation() {
        // Add bootstrap validation classes
        const forms = document.querySelectorAll('.needs-validation');
        forms.forEach(form => {
            form.addEventListener('submit', (event) => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            });
        });
    }

    validateForm(userData) {
        // Basic validation
        if (!userData.fullName || !userData.email || !userData.password) {
            this.showMessage('Please fill in all required fields', 'danger');
            return false;
        }

        if (userData.password !== userData.confirmPassword) {
            this.showMessage('Passwords do not match', 'danger');
            return false;
        }

        if (userData.password.length < 6) {
            this.showMessage('Password must be at least 6 characters long', 'danger');
            return false;
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(userData.email)) {
            this.showMessage('Please enter a valid email address', 'danger');
            return false;
        }

        return true;
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

    validatePasswordMatch() {
        const password = document.getElementById('password').value;
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

    showVerificationModal() {
        // Hide the signup form and show verification modal
        const verificationModal = new bootstrap.Modal(document.getElementById('verificationModal'));
        verificationModal.show();
        
        // Clear any previous verification messages
        this.hideMessage('verification-message-container');
        
        // Focus on verification code input
        setTimeout(() => {
            const verificationInput = document.getElementById('verificationCode');
            if (verificationInput) {
                verificationInput.focus();
            }
        }, 500);
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

    async handleSignup(formData) {
        try {
            console.log('🔄 Starting signup process...');
            
            // Store email for later use
            this.userEmail = formData.email;
            
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();
            console.log('📨 Registration response:', data);

            if (!response.ok) {
                throw new Error(data.message || 'Registration failed');
            }

            if (data.success) {
                // Store user ID for verification
                this.pendingUserId = data.userId;
                
                // Send verification email via EmailJS if email data is provided
                if (data.emailData && window.emailService) {
                    console.log('📧 Sending verification email via EmailJS...');
                    
                    if (!window.emailService.isConfigured()) {
                        console.warn('⚠️ EmailJS not configured - showing instructions');
                        window.emailService.showConfigInstructions();
                        
                        // Show the email data in console for development
                        console.log('='.repeat(50));
                        console.log('📧 DEVELOPMENT MODE - EMAIL DATA');
                        console.log('='.repeat(50));
                        console.log(`👤 User: ${data.emailData.fullName}`);
                        console.log(`📧 Email: ${data.emailData.email}`);
                        console.log(`🔢 Verification Code: ${data.emailData.code}`);
                        console.log('⚠️ Configure EmailJS to send real emails');
                        console.log('='.repeat(50));
                    } else {
                        // Send real email via EmailJS
                        const emailResult = await window.emailService.sendVerificationEmail(data.emailData);
                        if (emailResult.success) {
                            console.log('✅ Verification email sent successfully');
                        } else {
                            console.error('❌ Failed to send verification email:', emailResult.error);
                        }
                    }
                }

                // Show verification modal
                this.showVerificationModal();
                return { success: true, message: data.message };
            } else {
                throw new Error(data.message || 'Registration failed');
            }

        } catch (error) {
            console.error('❌ Signup error:', error);
            throw error;
        }
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

            // Store authentication token
            localStorage.setItem('authToken', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Show success message
            this.showMessage('Email verified successfully! Setting up your account...', 'success', 'verification-message-container', 'verification-message-alert');

            // For new users, redirect to onboarding flow: Security Questions -> Profile Setup -> Dashboard
            setTimeout(() => {
                // Add a flag to indicate this is a new user going through onboarding
                localStorage.setItem('isNewUserOnboarding', 'true');
                window.location.href = 'SecurityQuestions.html';
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
                throw new Error('No email address found. Please try signing up again.');
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

// Initialize signup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SignupManager();
});
