// Authentication utility for Apple Explorer
class AuthManager {
    constructor() {
        this.user = null;
        this.token = null;
        this.init();
    }

    init() {
        this.loadGoogleUserData();
        this.loadStoredAuth();
        // Delay user display update until DOM is ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.updateUserDisplay());
        } else {
            this.updateUserDisplay();
        }
    }

    loadGoogleUserData(){
        const urlParams = new URLSearchParams(window.location.search);
        const googleToken = urlParams.get('google_token');
        if (googleToken) {
            this.setAuth(googleToken, this.parseJwt(googleToken));
        }
        
    }

    parseJwt(token) {
        if(token === null || token === undefined) return null;
        const base64Url = token.split('.')[1];
        const base64 = base64Url
            .replace(/-/g, '+')
            .replace(/_/g, '/')
            .padEnd(base64Url.length + (4 - base64Url.length % 4) % 4, '=');

        const jsonPayload = decodeURIComponent(
            atob(base64)
            .split('')
            .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
            .join('')
        );

        return JSON.parse(jsonPayload);
    }

    loadStoredAuth() {
        this.token = localStorage.getItem('authToken');
        const userData = this.parseJwt(this.token) || null;
        if (userData) {
            try {
                this.user = userData;
            } catch (error) {
                console.error('Error parsing user data:', error);
                this.clearAuth();
            }
        }
    }

    isAuthenticated() {
        return !!(this.token && this.user);
    }

    getUser() {
        return this.user;
    }

    getToken() {
        return this.token;
    }

    async verifyToken() {
        if (!this.token) return false;

        try {
            const response = await fetch('/api/auth/profile', {
                headers: {
                    'Authorization': `Bearer ${this.token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    this.user = data.user;
                    return true;
                }
            }
            
            // Only clear auth if we get a definitive 401 Unauthorized
            // Don't clear for network errors or temporary server issues
            if (response.status === 401) {
                console.log('🔒 Token verification failed: Unauthorized');
                this.clearAuth();
                return false;
            }
            
            // For other errors (500, network issues, etc.), don't clear auth
            console.warn('⚠️ Token verification failed but not clearing auth:', response.status);
            return false;
        } catch (error) {
            console.error('Token verification error (network issue, not clearing auth):', error);
            // Don't clear auth for network errors - might be temporary
            return false;
        }
    }

    setAuth(token, user) {
        this.token = token;
        this.user = user;
        
        // Store login timestamp for session tracking
        const loginTime = new Date().getTime();
        localStorage.setItem('authToken', token);
        localStorage.setItem('loginTime', loginTime.toString());
        localStorage.setItem('tokenExpiry', (loginTime + (7 * 24 * 60 * 60 * 1000)).toString()); // 7 days
        
        this.updateUserDisplay();
        
        // Handle post-login redirect if auth guard is available
        if (window.authGuard) {
            window.authGuard.handlePostLoginRedirect();
        }
    }

    clearAuth() {
        this.token = null;
        this.user = null;
        localStorage.removeItem('authToken');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('tokenExpiry');
        this.updateUserDisplay();
    }

    getSessionInfo() {
        const loginTime = localStorage.getItem('loginTime');
        const tokenExpiry = localStorage.getItem('tokenExpiry');
        
        if (!loginTime || !tokenExpiry) {
            return null;
        }
        
        const now = new Date().getTime();
        const loginTimestamp = parseInt(loginTime);
        const expiryTimestamp = parseInt(tokenExpiry);
        
        return {
            loginTime: new Date(loginTimestamp),
            expiryTime: new Date(expiryTimestamp),
            remainingTime: Math.max(0, expiryTimestamp - now),
            isExpired: now >= expiryTimestamp,
            sessionDuration: expiryTimestamp - loginTimestamp
        };
    }

    isSessionValid() {
        const sessionInfo = this.getSessionInfo();
        return sessionInfo && !sessionInfo.isExpired;
    }

    async logout() {
        try {
            // Call logout endpoint
            if (this.token) {
                await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${this.token}`
                    }
                });
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            this.clearAuth();
            window.location.href = 'homepage.html';
        }
    }

    updateUserDisplay() {
        // Update user profile display in header
        this.updateHeaderUserInfo();
        
        // Update navigation based on authentication status
        this.updateNavigation();
    }

    updateHeaderUserInfo() {
        console.log('🔄 Updating header user info...', { authenticated: this.isAuthenticated(), user: this.user });
        
        // Look for user profile section in header
        const userProfileSection = document.querySelector('.header-right .admin-section');
        const userNameRole = document.querySelector('.header-right .user-name-role');
        const profileIcon = document.querySelector('.header-right .profile-icon');
        
        console.log('📍 Found elements:', { userProfileSection: !!userProfileSection, userNameRole: !!userNameRole, profileIcon: !!profileIcon });
        
        if (this.isAuthenticated() && this.user) {
            // Update user name and role display
            if (userNameRole) {
                userNameRole.textContent = `${this.user.fullName} (${this.user.role})`;
                console.log('✅ Updated user name/role to:', userNameRole.textContent);
            }

            // Update profile icon with user's initials
            if (profileIcon) {
                const initials = this.getInitials(this.user.fullName);
                profileIcon.textContent = initials;
                profileIcon.title = `${this.user.fullName} (${this.user.role})`;
                console.log('✅ Updated profile icon to:', initials);
                
                // Add click event for profile dropdown if not already added
                if (!profileIcon.getAttribute('data-dropdown-added')) {
                    profileIcon.style.cursor = 'pointer';
                    profileIcon.addEventListener('click', () => this.toggleProfileDropdown());
                    profileIcon.setAttribute('data-dropdown-added', 'true');
                    
                    // Create dropdown menu
                    this.createProfileDropdown();
                    console.log('✅ Added dropdown functionality');
                }
            }
        } else {
            console.log('❌ User not authenticated, showing default');
            // User not authenticated, show default
            if (userNameRole) {
                userNameRole.textContent = 'ADMINISTRATION/USER LOGIN';
            }
            
            if (profileIcon) {
                profileIcon.textContent = 'P';
                profileIcon.title = 'Login Required';
                profileIcon.style.cursor = 'pointer';
                
                // Add click event to redirect to login
                profileIcon.onclick = () => window.location.href = 'LoginPage.html';
            }
        }
    }

    updateNavigation() {
        // Update navigation links based on user role
        const navLinks = document.querySelectorAll('nav ul li a');
        
        if (this.isAuthenticated() && this.user) {
            // Enable all navigation based on role
            navLinks.forEach(link => {
                link.style.pointerEvents = 'auto';
                link.style.opacity = '1';
            });
            
            // Add role-specific restrictions if needed
            if (this.user.role === 'Viewer') {
                // Viewers might have some restrictions
                // This can be expanded based on requirements
            }
        } else {
            // Restrict some navigation for non-authenticated users
            navLinks.forEach(link => {
                if (link.href.includes('dashboard') || link.href.includes('user-management')) {
                    link.style.pointerEvents = 'none';
                    link.style.opacity = '0.5';
                }
            });
        }
    }

    getInitials(fullName) {
        if (!fullName) return 'U';
        
        const names = fullName.trim().split(' ');
        if (names.length === 1) {
            return names[0].charAt(0).toUpperCase();
        }
        
        return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
    }

    createProfileDropdown() {
        // Remove existing dropdown if present
        const existingDropdown = document.getElementById('profile-dropdown');
        if (existingDropdown) {
            existingDropdown.remove();
        }

        // Create dropdown menu
        const dropdown = document.createElement('div');
        dropdown.id = 'profile-dropdown';
        dropdown.className = 'profile-dropdown';
        dropdown.style.cssText = `
            position: absolute;
            top: 100%;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-radius: 4px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            z-index: 1000;
            min-width: 200px;
            display: none;
        `;

        if (this.isAuthenticated() && this.user) {
            dropdown.innerHTML = `
                <div style="padding: 15px; border-bottom: 1px solid #eee;">
                    <div style="font-weight: bold; color: #333;">${this.user.fullName}</div>
                    <div style="color: #666; font-size: 14px;">${this.user.email}</div>
                    <div style="color: #888; font-size: 12px;">Role: ${this.user.role}</div>
                </div>
                <div style="padding: 10px;">
                    <button id="profile-btn" style="display: block; width: 100%; padding: 8px; border: none; background: none; text-align: left; cursor: pointer; border-radius: 4px;" onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='transparent'">
                        <i class="fa fa-user"></i> Profile Settings
                    </button>
                    <button id="change-password-btn" style="display: block; width: 100%; padding: 8px; border: none; background: none; text-align: left; cursor: pointer; border-radius: 4px;" onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='transparent'">
                        <i class="fa fa-key"></i> Change Password
                    </button>
                    <button id="logout-btn" style="display: block; width: 100%; padding: 8px; border: none; background: none; text-align: left; cursor: pointer; color: #dc3545; border-radius: 4px;" onmouseover="this.style.backgroundColor='#f5f5f5'" onmouseout="this.style.backgroundColor='transparent'">
                        <i class="fa fa-sign-out"></i> Logout
                    </button>
                </div>
            `;

            // Add event listeners
            setTimeout(() => {
                const logoutBtn = dropdown.querySelector('#logout-btn');
                if (logoutBtn) {
                    logoutBtn.addEventListener('click', () => this.logout());
                }
                
                const changePasswordBtn = dropdown.querySelector('#change-password-btn');
                if (changePasswordBtn) {
                    changePasswordBtn.addEventListener('click', () => {
                        window.authGuard.openChangePasswordModal();
                    });
                }

                const profileBtn = dropdown.querySelector('#profile-btn');
                if (profileBtn) {
                    profileBtn.addEventListener('click', () => {
                        this.toggleProfileDropdown();
                        // Use the auth guard's profile modal
                        if (window.authGuard) {
                            window.authGuard.openProfileModal();
                        } 
                    });
                }

                const pathnames = window.location.pathname.split('/').filter(item => item !== '');
                const currentPage = pathnames[0]; 
                
                /*
                These buttons do not have their modals appear due to auth-gurad.js not being present
                on homepage. Also some modal HTML might be missing?

                This is a temporary fix.
                */
                if(currentPage == "homepage.html"){
                    changePasswordBtn.style.display = "none";
                    profileBtn.style.display = "none";
                }

            }, 0);
        }

        // Add dropdown to the user profile section
        const userProfileSection = document.querySelector('.header-right .admin-section');
        if (userProfileSection) {
            userProfileSection.style.position = 'relative';
            userProfileSection.appendChild(dropdown);
        }
    }

    toggleProfileDropdown() {
        const dropdown = document.getElementById('profile-dropdown');
        if (dropdown) {
            dropdown.style.display = dropdown.style.display === 'block' ? 'none' : 'block';
        }
    }

    // Close dropdown when clicking outside
    closeDropdownOnClickOutside() {
        document.addEventListener('click', (event) => {
            const dropdown = document.getElementById('profile-dropdown');
            const profileIcon = document.querySelector('.profile-icon');
            
            if (dropdown && profileIcon && 
                !dropdown.contains(event.target) && 
                !profileIcon.contains(event.target)) {
                dropdown.style.display = 'none';
            }
        });
    }

    // Check if user has permission for specific actions
    hasPermission(action) {
        if (!this.isAuthenticated()) return false;
        
        const userRole = this.user.role;
        
        switch (action) {
            case 'view':
                return ['Viewer', 'Researcher', 'Administrator'].includes(userRole);
            case 'add':
            case 'edit':
                return ['Researcher', 'Administrator'].includes(userRole);
            case 'delete':
            case 'manage_users':
                return userRole === 'Administrator';
            default:
                return false;
        }
    }

    // Protect routes that require authentication
    requireAuth(redirectUrl = 'LoginPage.html') {
        if (!this.isAuthenticated()) {
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }

    // Protect routes that require specific permissions
    requirePermission(action, redirectUrl = 'homepage.html') {
        if (!this.hasPermission(action)) {
            alert(`Access denied. This action requires ${action} permissions.`);
            window.location.href = redirectUrl;
            return false;
        }
        return true;
    }
}

// Create global auth manager instance
window.authManager = new AuthManager();

// Initialize dropdown close functionality
document.addEventListener('DOMContentLoaded', () => {
    window.authManager.closeDropdownOnClickOutside();
});

// Auto-verify token on page load
document.addEventListener('DOMContentLoaded', async () => {
    if (window.authManager.isAuthenticated()) {
        // First check client-side session expiry
        const sessionInfo = window.authManager.getSessionInfo();
        if (sessionInfo && sessionInfo.isExpired) {
            console.log('⏰ Client-side session expired (7 days passed)');
            alert('Your session has expired. Please log in again.');
            window.location.href = 'LoginPage.html';
            return;
        }

        // Only verify with server very rarely (every 2 hours) and don't redirect on failure
        const lastVerification = localStorage.getItem('lastTokenVerification');
        const now = Date.now();
        const twoHours = 2 * 60 * 60 * 1000; // 2 hours in milliseconds
        
        if (!lastVerification || (now - parseInt(lastVerification)) > twoHours) {
            const isValid = await window.authManager.verifyToken();
            if (isValid) {
                // Update last verification time only on successful verification
                localStorage.setItem('lastTokenVerification', now.toString());
            }
            // Don't redirect on verification failure - let the user continue using the app
            // The 7-day client-side timer will handle actual expiry
        }
    }
});
