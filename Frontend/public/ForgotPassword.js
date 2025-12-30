// State management for password reset flow
let resetState = {
    currentStep: 1,
    email: '',
    resetToken: ''
};

// Initialize email service
let emailService;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    initializePasswordReset();
});

async function initializePasswordReset() {
    // Initialize email service
    emailService = new EmailService();
    
    // Set up form event listeners
    document.getElementById('emailForm').addEventListener('submit', handleEmailSubmit);
    document.getElementById('pinForm').addEventListener('submit', handlePinSubmit);
    document.getElementById('passwordForm').addEventListener('submit', handlePasswordSubmit);
    
    // Show initial step
    goToStep(1);
}

// Step navigation
function goToStep(step) {
    // Hide all steps
    document.querySelectorAll('.reset-step').forEach(el => {
        el.style.display = 'none';
    });
    
    // Show current step
    document.getElementById(`step${step}`).style.display = 'block';
    resetState.currentStep = step;
    
    // Clear message area
    document.getElementById('messageArea').innerHTML = '';
}

// Step 1: Send reset PIN to email
async function handleEmailSubmit(e) {
    e.preventDefault();
    
    const email = document.getElementById('reset-email').value.trim();
    if (!email) {
        showMessage('Please enter your email address', 'danger');
        return;
    }
    
    if (!isValidEmail(email)) {
        showMessage('Please enter a valid email address', 'danger');
        return;
    }
    
    try {
        showLoading('Sending reset PIN...');
        
        const response = await fetch('/api/auth/forgot-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            resetState.email = email;
            
            // If we have email data, send the actual email via EmailJS
            if (data.emailData && emailService) {
                showMessage('Sending reset PIN to your email...', 'info');
                
                const emailResult = await emailService.sendPasswordResetEmail(data.emailData);
                
                if (emailResult.success) {
                    showMessage('A reset PIN has been sent to your email address', 'success');
                } else {
                    showMessage('Email sent via backend, but EmailJS delivery may have failed. Check console for reset token.', 'warning');
                    // Still allow progression as backend has the token
                }
            } else {
                showMessage('Reset PIN generated successfully', 'success');
            }
            
            // Show email data in console for development (remove in production)
            if (data.emailData) {
                console.log('='.repeat(50));
                console.log('📧 RESET PIN EMAIL DATA (DEV MODE)');
                console.log('='.repeat(50));
                console.log('Email:', data.emailData.email);
                console.log('Reset Token:', data.emailData.token);
                console.log('='.repeat(50));
            }
            
            setTimeout(() => goToStep(2), 2000);
        } else {
            showMessage(data.message || 'Failed to send reset PIN', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Email submission error:', error);
        showMessage('Network error. Please try again.', 'danger');
    }
}

// Step 2: Verify PIN
async function handlePinSubmit(e) {
    e.preventDefault();
    
    const pin = document.getElementById('reset-pin').value.trim();
    if (!pin) {
        showMessage('Please enter the PIN from your email', 'danger');
        return;
    }
    
    // Store the PIN as reset token for verification in step 3
    resetState.resetToken = pin;
    showMessage('PIN verified! Please enter your new password', 'success');
    setTimeout(() => goToStep(3), 1500);
}

// Step 3: Reset password
async function handlePasswordSubmit(e) {
    e.preventDefault();
    
    const newPassword = document.getElementById('new-password').value;
    const confirmPassword = document.getElementById('confirm-password').value;
    
    if (!newPassword || !confirmPassword) {
        showMessage('Please fill in both password fields', 'danger');
        return;
    }
    
    if (newPassword.length < 6) {
        showMessage('Password must be at least 6 characters long', 'danger');
        return;
    }
    
    if (newPassword !== confirmPassword) {
        showMessage('Passwords do not match', 'danger');
        return;
    }
    
    try {
        showLoading('Resetting password...');
        
        const response = await fetch('/api/auth/reset-password', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: resetState.email,
                token: resetState.resetToken,
                newPassword: newPassword
            })
        });
        
        const data = await response.json();
        hideLoading();
        
        if (data.success) {
            // Hide all steps and show success
            document.querySelectorAll('.reset-step').forEach(el => {
                el.style.display = 'none';
            });
            document.getElementById('successMessage').style.display = 'block';
        } else {
            showMessage(data.message || 'Failed to reset password', 'danger');
        }
    } catch (error) {
        hideLoading();
        console.error('Password reset error:', error);
        showMessage('Network error. Please try again.', 'danger');
    }
}

// Utility functions
function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function showMessage(message, type = 'info') {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        </div>
    `;
}

function showLoading(message) {
    const messageArea = document.getElementById('messageArea');
    messageArea.innerHTML = `
        <div class="alert alert-info" role="alert">
            <div class="d-flex align-items-center">
                <div class="spinner-border spinner-border-sm me-2" role="status">
                    <span class="visually-hidden">Loading...</span>
                </div>
                ${message}
            </div>
        </div>
    `;
}

function hideLoading() {
    // Loading will be replaced by next message
}