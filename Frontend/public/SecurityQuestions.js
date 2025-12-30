// Security Questions functionality for Apple Explorer
class SecurityQuestionsManager {
    constructor() {
        this.init();
    }

    init() {
        this.setupMode();
        this.bindEvents();
    }

    setupMode() {
        // Check if this is part of new user onboarding
        const isNewUserOnboarding = localStorage.getItem('isNewUserOnboarding');
        const params = new URLSearchParams(window.location.search);
        const mode = params.get("mode") || (isNewUserOnboarding ? "first-time" : "forgot");

        const existingQuestionGroup = document.getElementById("existing-question-group");
        const newQuestionGroup = document.getElementById("new-question-group");
        const confirmRow = document.getElementById("confirm-answer-row");

        if (mode === "first-time") {
            existingQuestionGroup.classList.add("d-none");
            newQuestionGroup.classList.remove("d-none");
            confirmRow.classList.remove("d-none");
            
            // Update page title and instructions for new users
            document.title = "Security Questions Setup - Apple Explorer";
            this.updateInstructions(true);
        } else {
            existingQuestionGroup.classList.remove("d-none");
            newQuestionGroup.classList.add("d-none");
            confirmRow.classList.add("d-none");
            
            this.updateInstructions(false);
        }

        // Store the current mode
        this.mode = mode;
    }

    updateInstructions(isFirstTime) {
        // Find or create instructions element
        let instructionsEl = document.querySelector('.security-instructions');
        if (!instructionsEl) {
            instructionsEl = document.createElement('div');
            instructionsEl.className = 'security-instructions mb-4';
            const cardBody = document.querySelector('.card-body');
            cardBody.insertBefore(instructionsEl, cardBody.firstChild);
        }

        if (isFirstTime) {
            instructionsEl.innerHTML = `
                <h3 class="text-center mb-3">Set Up Security Questions</h3>
                <p class="text-center text-muted mb-4">
                    Please choose a security question and provide an answer. This will help us verify your identity if you forget your password.
                </p>
            `;
        } else {
            instructionsEl.innerHTML = `
                <h3 class="text-center mb-3">Security Question</h3>
                <p class="text-center text-muted mb-4">
                    Please answer your security question to proceed.
                </p>
            `;
        }
    }

    bindEvents() {
        // Form submission
        const securityForm = document.getElementById('security-form');
        if (securityForm) {
            securityForm.addEventListener('submit', (e) => this.handleFormSubmission(e));
        }

        // Validate matching answers for first-time setup
        const answerInput = document.getElementById('security-answer');
        const confirmInput = document.getElementById('confirm-answer');
        
        if (confirmInput) {
            confirmInput.addEventListener('input', () => this.validateAnswerMatch());
        }
        if (answerInput) {
            answerInput.addEventListener('input', () => this.validateAnswerMatch());
        }
    }

    validateAnswerMatch() {
        const answer = document.getElementById('security-answer').value;
        const confirmAnswer = document.getElementById('confirm-answer').value;
        const confirmInput = document.getElementById('confirm-answer');

        if (confirmAnswer && answer !== confirmAnswer) {
            confirmInput.setCustomValidity('Answers do not match');
            confirmInput.classList.add('is-invalid');
        } else {
            confirmInput.setCustomValidity('');
            confirmInput.classList.remove('is-invalid');
            if (confirmAnswer) {
                confirmInput.classList.add('is-valid');
            }
        }
    }

    async handleFormSubmission(event) {
        event.preventDefault();

        this.setLoading(true);

        try {
            if (this.mode === "first-time") {
                await this.handleFirstTimeSetup(event);
            } else {
                await this.handlePasswordReset(event);
            }
        } catch (error) {
            console.error('Security questions error:', error);
            this.showMessage(error.message || 'An error occurred. Please try again.', 'danger');
        } finally {
            this.setLoading(false);
        }
    }

    async handleFirstTimeSetup(event) {
        const formData = new FormData(event.target);
        const securityData = {
            question: formData.get('new-security-question'),
            answer: formData.get('security-answer')
        };

        // Validate form data
        if (!securityData.question || !securityData.answer) {
            throw new Error('Please select a question and provide an answer');
        }

        const confirmAnswer = formData.get('confirm-answer');
        if (securityData.answer !== confirmAnswer) {
            throw new Error('Answers do not match');
        }

        // Send to backend
        const response = await fetch('/api/auth/setup-security-questions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify(securityData)
        });

        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.message || 'Failed to set up security questions');
        }

        this.showMessage('Security questions set up successfully! Proceeding to profile setup...', 'success');

        // Continue to profile setup
        setTimeout(() => {
            window.location.href = 'profile-setup.html';
        }, 2000);
    }

    async handlePasswordReset(event) {
        // This would handle the forgot password flow
        // Implementation depends on your existing password reset logic
        const formData = new FormData(event.target);
        const answer = formData.get('security-answer');

        if (!answer) {
            throw new Error('Please provide an answer to the security question');
        }

        // Add your password reset logic here
        this.showMessage('Security question verification would happen here', 'info');
    }

    setLoading(loading) {
        const submitBtn = document.querySelector('button[type="submit"]');
        if (!submitBtn) return;

        if (loading) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status"></span>
                Processing...
            `;
        } else {
            submitBtn.disabled = false;
            if (this.mode === "first-time") {
                submitBtn.innerHTML = 'Continue to Profile Setup';
            } else {
                submitBtn.innerHTML = 'Verify Answer';
            }
        }
    }

    showMessage(message, type = 'success') {
        // Find or create message container
        let container = document.getElementById('security-message-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'security-message-container';
            const form = document.getElementById('security-form');
            form.parentNode.insertBefore(container, form);
        }

        const alertClass = `alert-${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'danger' ? 'fa-exclamation-circle' : 
                         'fa-info-circle';

        container.innerHTML = `
            <div class="alert ${alertClass} alert-dismissible fade show" role="alert">
                <i class="fas ${iconClass} me-2"></i>
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
            </div>
        `;

        // Auto-hide after 5 seconds for non-error messages
        if (type !== 'danger') {
            setTimeout(() => {
                const alert = container.querySelector('.alert');
                if (alert) {
                    alert.remove();
                }
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", function () {
    new SecurityQuestionsManager();
});
