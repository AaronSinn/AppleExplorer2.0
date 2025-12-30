// Authentication Guard for Apple Explorer
// This file provides route protection and user profile management

class AuthGuard {
    constructor() {
        this.protectedPages = [
            'dashboard.html',
            'search.html', 
            'user-management.html',
            'profile-setup.html',
            'SecurityQuestions.html'
        ];
        this.publicPages = [
            'homepage.html',
            'LoginPage.html',
            'signup.html',
            'ForgotPassword.html',
            'ForgotPassword-new.html'
        ];
        this.init();
    }

    init() {
        this.checkPageAccess();
        this.setupProfileManagement();
        this.updateAllNavigationLinks();
    }

    getCurrentPage() {
        const pathname = window.location.pathname;
        return pathname.split('/').pop() || 'index.html';
    }

    isProtectedPage(page = null) {
        const currentPage = page || this.getCurrentPage();
        return this.protectedPages.some(protectedPage => 
            currentPage.includes(protectedPage.replace('.html', ''))
        );
    }

    checkPageAccess() {
        const currentPage = this.getCurrentPage();
        
        // Skip checks for public pages
        if (this.publicPages.some(page => currentPage.includes(page.replace('.html', '')))) {
            return;
        }

        // Check if current page requires authentication
        if (this.isProtectedPage(currentPage)) {
            if (!window.authManager || !window.authManager.isAuthenticated()) {
                console.log('🔒 Access denied: Authentication required');
                this.redirectToLogin();
                return;
            }

            // Additional role-based checks
            const user = window.authManager.getUser();
            if (!this.hasPageAccess(currentPage, user)) {
                console.log('🔒 Access denied: Insufficient permissions');
                this.redirectToHomepage();
                return;
            }

            console.log('✅ Access granted to:', currentPage);
        }
    }

    hasPageAccess(page, user) {
        if (!user) return false;

        const userRole = user.role;

        // Define page access rules
        const pageAccessRules = {
            'dashboard.html': ['Viewer', 'Researcher', 'Administrator'],
            'search.html': ['Viewer', 'Researcher', 'Administrator'],
            'user-management.html': ['Administrator'], // Only admins can manage users
            'profile-setup.html': ['Viewer', 'Researcher', 'Administrator'],
            'SecurityQuestions.html': ['Viewer', 'Researcher', 'Administrator']
        };

        const allowedRoles = pageAccessRules[page];
        return allowedRoles ? allowedRoles.includes(userRole) : true;
    }

    redirectToLogin() {
        // Store current page to redirect back after login
        localStorage.setItem('redirectAfterLogin', window.location.href);
        
        // Show user-friendly message
        this.showAccessMessage('Please log in to access this page', 'warning');
        
        setTimeout(() => {
            window.location.href = 'LoginPage.html';
        }, 2000);
    }

    redirectToHomepage() {
        this.showAccessMessage('You do not have permission to access this page', 'error');
        
        setTimeout(() => {
            window.location.href = 'homepage.html';
        }, 2000);
    }

    showAccessMessage(message, type = 'info') {
        // Create or update message banner
        let banner = document.getElementById('auth-message-banner');
        if (!banner) {
            banner = document.createElement('div');
            banner.id = 'auth-message-banner';
            banner.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                z-index: 10000;
                padding: 15px;
                text-align: center;
                font-weight: bold;
                color: white;
                background-color: ${type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8'};
                box-shadow: 0 2px 4px rgba(0,0,0,0.1);
            `;
            document.body.insertBefore(banner, document.body.firstChild);
        }

        banner.textContent = message;
        banner.style.backgroundColor = type === 'error' ? '#dc3545' : type === 'warning' ? '#ffc107' : '#17a2b8';

        // Auto-hide after 2 seconds
        setTimeout(() => {
            if (banner && banner.parentNode) {
                banner.parentNode.removeChild(banner);
            }
        }, 2500);
    }

    updateAllNavigationLinks() {
        const navLinks = document.querySelectorAll('nav ul li a');
        
        navLinks.forEach(link => {
            const href = link.getAttribute('href');
            if (href) {
                this.updateNavigationLink(link, href);
            }
        });
    }

    updateNavigationLink(link, href) {
        const isAuthenticated = window.authManager && window.authManager.isAuthenticated();
        const user = isAuthenticated ? window.authManager.getUser() : null;
        
        // Check if this link points to a protected page
        if (this.isProtectedPage(href)) {
            if (!isAuthenticated) {
                // User not logged in - disable link
                link.style.opacity = '0.5';
                link.style.pointerEvents = 'none';
                link.title = 'Login required';
                
                // Add click handler to redirect to login
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.redirectToLogin();
                });
            } else if (!this.hasPageAccess(href, user)) {
                // User doesn't have permission - disable link
                link.style.opacity = '0.5';
                link.style.pointerEvents = 'none';
                link.title = 'Insufficient permissions';
                
                // Add click handler to show access denied
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.showAccessMessage('You do not have permission to access this page', 'error');
                });
            } else {
                // User has access - enable link
                link.style.opacity = '1';
                link.style.pointerEvents = 'auto';
                link.title = '';
            }
        } else {
            // Public page - always enable
            link.style.opacity = '1';
            link.style.pointerEvents = 'auto';
            link.title = '';
        }
    }

    setupProfileManagement() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.initProfileManagement());
        } else {
            this.initProfileManagement();
        }
    }

    initProfileManagement() {
        // Replace the existing profile button functionality
        setTimeout(() => {
            const profileBtn = document.querySelector('#profile-btn');
            if (profileBtn) {
                profileBtn.removeEventListener('click', profileBtn._originalHandler);
                profileBtn.addEventListener('click', () => this.openProfileModal());
            }
        }, 1000);

        // Create profile modal
        this.createProfileModal();
    }

    createProfileModal() {
        // Remove existing modal if present
        const existingModal = document.getElementById('profile-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Create profile modal
        const modal = document.createElement('div');
        modal.id = 'profile-modal';
        modal.className = 'modal fade';
        modal.style.cssText = `
            display: none;
            position: fixed;
            z-index: 10000;
            left: 0;
            top: 0;
            width: 100%;
            height: 100%;
            background-color: rgba(0,0,0,0.5);
        `;

        modal.innerHTML = `
            <div class="modal-dialog" style="margin: 50px auto; width: 600px; max-width: 90%;">
                <div class="modal-content" style="background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                    <div class="modal-header" style="padding: 20px; border-bottom: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center;">
                        <h3 style="margin: 0; color: #333;">Profile Settings</h3>
                        <button id="close-profile-modal" style="background: none; border: none; font-size: 24px; cursor: pointer; color: #666;">&times;</button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <form id="profile-form">
                            <div class="row">
                                <div class="col-md-6">
                                    <div class="form-group" style="margin-bottom: 15px;">
                                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">First Name:</label>
                                        <input type="text" id="profile-firstName" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                </div>
                                <div class="col-md-6">
                                    <div class="form-group" style="margin-bottom: 15px;">
                                        <label style="display: block; margin-bottom: 5px; font-weight: bold;">Last Name:</label>
                                        <input type="text" id="profile-lastName" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                                    </div>
                                </div>
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Email:</label>
                                <input type="email" id="profile-email" class="form-control" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background-color: #f5f5f5;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Role:</label>
                                <input type="text" id="profile-role" class="form-control" readonly style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px; background-color: #f5f5f5;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Phone:</label>
                                <input type="tel" id="profile-phone" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Organization:</label>
                                <input type="text" id="profile-organization" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div class="form-group" style="margin-bottom: 15px;">
                                <label style="display: block; margin-bottom: 5px; font-weight: bold;">Job Title:</label>
                                <input type="text" id="profile-jobTitle" class="form-control" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;">
                            </div>
                            <div id="profile-message" style="margin-bottom: 15px; padding: 10px; border-radius: 4px; display: none;"></div>
                        </form>
                    </div>
                    <div class="modal-footer" style="padding: 20px; border-top: 1px solid #ddd; text-align: right;">
                        <button type="button" id="cancel-profile" class="btn btn-secondary" style="padding: 8px 16px; margin-right: 10px; border: 1px solid #ccc; background: #f8f9fa; color: #333; border-radius: 4px; cursor: pointer;">Cancel</button>
                        <button type="button" id="save-profile" class="btn btn-primary" style="padding: 8px 16px; border: none; background: #007bff; color: white; border-radius: 4px; cursor: pointer;">Save Changes</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        const closeBtn = modal.querySelector('#close-profile-modal');
        const cancelBtn = modal.querySelector('#cancel-profile');
        const saveBtn = modal.querySelector('#save-profile');

        closeBtn.addEventListener('click', () => this.closeProfileModal());
        cancelBtn.addEventListener('click', () => this.closeProfileModal());
        saveBtn.addEventListener('click', () => this.saveProfile());

        // Close modal when clicking outside
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.closeProfileModal();
            }
        });
    }

    openProfileModal() {
        if (!window.authManager || !window.authManager.isAuthenticated()) {
            this.redirectToLogin();
            return;
        }

        const modal = document.getElementById('profile-modal');
        const user = window.authManager.getUser();

        if (modal && user) {
            // Populate form with current user data
            this.loadProfileData(user);
            modal.style.display = 'block';
            
            // Close any existing dropdowns
            const dropdown = document.getElementById('profile-dropdown');
            if (dropdown) {
                dropdown.style.display = 'none';
            }
        }
    }

    loadProfileData(user) {
        // Split full name into first and last name
        const nameParts = user.fullName ? user.fullName.split(' ') : ['', ''];
        const firstName = nameParts[0] || '';
        const lastName = nameParts.slice(1).join(' ') || '';

        document.getElementById('profile-firstName').value = firstName;
        document.getElementById('profile-lastName').value = lastName;
        document.getElementById('profile-email').value = user.email || '';
        document.getElementById('profile-role').value = user.role || '';
        document.getElementById('profile-phone').value = user.phone || '';
        document.getElementById('profile-organization').value = user.organization || '';
        document.getElementById('profile-jobTitle').value = user.jobTitle || '';
    }

    async saveProfile() {
        const saveBtn = document.getElementById('save-profile');
        const originalText = saveBtn.textContent;
        
        try {
            saveBtn.textContent = 'Saving...';
            saveBtn.disabled = true;

            const profileData = {
                firstName: document.getElementById('profile-firstName').value.trim(),
                lastName: document.getElementById('profile-lastName').value.trim(),
                phone: document.getElementById('profile-phone').value.trim(),
                organization: document.getElementById('profile-organization').value.trim(),
                jobTitle: document.getElementById('profile-jobTitle').value.trim()
            };

            // Validate required fields
            if (!profileData.firstName || !profileData.lastName) {
                throw new Error('First name and last name are required');
            }

            const response = await fetch('/api/auth/update-profile', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${window.authManager.getToken()}`
                },
                body: JSON.stringify(profileData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to update profile');
            }

            // Update local user data
            const currentUser = window.authManager.getUser();
            const updatedUser = {
                ...currentUser,
                fullName: `${profileData.firstName} ${profileData.lastName}`,
                ...profileData
            };

            window.authManager.setAuth(window.authManager.getToken(), updatedUser);

            this.showProfileMessage('Profile updated successfully!', 'success');

            // Close modal after 1.5 seconds
            setTimeout(() => {
                this.closeProfileModal();
            }, 1500);

        } catch (error) {
            console.error('Profile update error:', error);
            this.showProfileMessage(error.message || 'Failed to update profile', 'error');
        } finally {
            saveBtn.textContent = originalText;
            saveBtn.disabled = false;
        }
    }

    showProfileMessage(message, type = 'success') {
        const messageDiv = document.getElementById('profile-message');
        if (messageDiv) {
            messageDiv.textContent = message;
            messageDiv.style.display = 'block';
            messageDiv.style.backgroundColor = type === 'success' ? '#d4edda' : '#f8d7da';
            messageDiv.style.color = type === 'success' ? '#155724' : '#721c24';
            messageDiv.style.border = `1px solid ${type === 'success' ? '#c3e6cb' : '#f5c6cb'}`;

            // Auto-hide after 3 seconds
            setTimeout(() => {
                messageDiv.style.display = 'none';
            }, 3000);
        }
    }

    closeProfileModal() {
        const modal = document.getElementById('profile-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    // Handle post-login redirects
    handlePostLoginRedirect() {
        const redirectUrl = localStorage.getItem('redirectAfterLogin');
        if (redirectUrl) {
            localStorage.removeItem('redirectAfterLogin');
            window.location.href = redirectUrl;
        }
    }
}

// Initialize AuthGuard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.authGuard = new AuthGuard();
});

// Also initialize immediately if DOM is already loaded
if (document.readyState !== 'loading') {
    window.authGuard = new AuthGuard();
}
