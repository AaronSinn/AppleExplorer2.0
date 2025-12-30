// Profile Setup functionality for Apple Explorer
class ProfileSetupManager {
    constructor() {
        this.init();
    }

    init() {
        this.bindEvents();
        this.loadUserData();
    }

    bindEvents() {
        // Profile setup form submission
        const profileForm = document.getElementById('profile-setup-form');
        if (profileForm) {
            profileForm.addEventListener('submit', (e) => this.handleProfileSetup(e));
        }

        // Skip profile button
        const skipBtn = document.getElementById('skip-profile-btn');
        if (skipBtn) {
            skipBtn.addEventListener('click', () => this.skipProfile());
        }

        // Country selection change
        const countrySelect = document.getElementById('country');
        if (countrySelect) {
            countrySelect.addEventListener('change', (e) => this.handleCountryChange(e));
        }
    }

    loadUserData() {
        // Pre-fill form with any existing user data
        const userData = JSON.parse(localStorage.getItem('user') || '{}');
        
        if (userData.fullName) {
            // Try to split fullName into first and last name
            const nameParts = userData.fullName.split(' ');
            if (nameParts.length >= 2) {
                document.getElementById('firstName').value = nameParts[0];
                document.getElementById('lastName').value = nameParts.slice(1).join(' ');
            } else {
                document.getElementById('firstName').value = userData.fullName;
            }
        }
    }

    async handleProfileSetup(event) {
        event.preventDefault();
        
        this.setLoading(true);
        
        try {
            // Get form data
            const formData = new FormData(event.target);
            const profileData = {
                firstName: formData.get('firstName'),
                lastName: formData.get('lastName'),
                phone: formData.get('phone'),
                organization: formData.get('organization'),
                jobTitle: formData.get('jobTitle'),
                department: formData.get('department'),
                interests: formData.get('interests'),
                country: formData.get('country'),
                province: formData.get('province'),
                notifications: formData.get('notifications') === 'on',
                newsletter: formData.get('newsletter') === 'on'
            };

            // Validate required fields
            if (!profileData.firstName || !profileData.lastName || !profileData.country) {
                this.showMessage('Please fill in all required fields (First Name, Last Name, Country)', 'danger');
                return;
            }

            // Send profile data to backend
            const response = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update profile');
            }

            // Update local storage with new user data
            const updatedUser = { ...JSON.parse(localStorage.getItem('user') || '{}'), ...profileData };
            localStorage.setItem('user', JSON.stringify(updatedUser));

            // Clear the onboarding flag since user has completed the flow
            localStorage.removeItem('isNewUserOnboarding');

            this.showMessage('Profile updated successfully! Redirecting to dashboard...', 'success');

            // Redirect to dashboard after 2 seconds
            setTimeout(() => {
                window.location.href = 'dashboard.html';
            }, 2000);

        } catch (error) {
            console.error('Profile setup error:', error);
            this.showMessage(error.message || 'Failed to update profile. Please try again.', 'danger');
        } finally {
            this.setLoading(false);
        }
    }

    skipProfile() {
        // Mark profile as skipped and redirect to dashboard
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        user.profileSkipped = true;
        localStorage.setItem('user', JSON.stringify(user));

        // Clear the onboarding flag
        localStorage.removeItem('isNewUserOnboarding');

        this.showMessage('Profile setup skipped. You can complete it later in settings.', 'info');
        
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1500);
    }

    handleCountryChange(event) {
        const provinceInput = document.getElementById('province');
        const selectedCountry = event.target.value;

        // Update province label based on country
        const provinceLabel = document.querySelector('label[for="province"]');
        if (selectedCountry === 'Canada') {
            provinceLabel.textContent = 'Province (Optional)';
            provinceInput.placeholder = 'e.g., Ontario, British Columbia';
        } else if (selectedCountry === 'United States') {
            provinceLabel.textContent = 'State (Optional)';
            provinceInput.placeholder = 'e.g., California, New York';
        } else {
            provinceLabel.textContent = 'Province/State (Optional)';
            provinceInput.placeholder = '';
        }
    }

    setLoading(loading) {
        const submitBtn = document.getElementById('profile-submit-btn');
        const submitText = document.getElementById('profile-submit-text');
        const submitLoading = document.getElementById('profile-submit-loading');
        const skipBtn = document.getElementById('skip-profile-btn');

        if (loading) {
            submitBtn.disabled = true;
            submitText.textContent = 'Updating Profile...';
            submitLoading.classList.remove('d-none');
            skipBtn.disabled = true;
        } else {
            submitBtn.disabled = false;
            submitText.textContent = 'Complete Profile Setup';
            submitLoading.classList.add('d-none');
            skipBtn.disabled = false;
        }
    }

    showMessage(message, type = 'success') {
        const container = document.getElementById('message-container');
        
        const alertClass = `alert-${type}`;
        const iconClass = type === 'success' ? 'fa-check-circle' : 
                         type === 'danger' ? 'fa-exclamation-circle' : 
                         type === 'info' ? 'fa-info-circle' : 'fa-exclamation-triangle';

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

// Initialize the profile setup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new ProfileSetupManager();
});
