// Dashboard functionality
class DashboardManager {
  constructor() {
    // Get current user from AuthManager
    this.authManager = window.authManager;
    this.currentUser = this.authManager?.getUser() || {
      name: "Guest User",
      role: "admin",
      permissions: ["manage_users", "approve_tasks", "view_history", "manage_permissions"],
    }

    this.pendingTasks = [
      {
        id: 1,
        title: "Database Update Request",
        description: "User John Doe has requested to update apple variety information",
        type: "database_update",
        status: "pending",
        submittedBy: "John Doe",
        submittedAt: "2025-06-04 08:30:00",
      },
      {
        id: 2,
        title: "New User Registration",
        description: "Jane Smith has applied for researcher access",
        type: "user_registration",
        status: "pending",
        submittedBy: "Jane Smith",
        submittedAt: "2025-06-04 07:15:00",
      },
      {
        id: 3,
        title: "Permission Upgrade Request",
        description: "Bob Wilson requests admin privileges for regional database",
        type: "permission_upgrade",
        status: "pending",
        submittedBy: "Bob Wilson",
        submittedAt: "2025-06-03 16:45:00",
      },
    ]

    this.users = [
      {
        id: 1,
        name: "John Doe",
        email: "john.doe@example.com",
        role: "researcher",
        status: "active",
        lastLogin: "2025-06-04 09:00:00",
      },
      {
        id: 2,
        name: "Jane Smith",
        email: "jane.smith@example.com",
        role: "viewer",
        status: "pending",
        lastLogin: "Never",
      },
      {
        id: 3,
        name: "Bob Wilson",
        email: "bob.wilson@example.com",
        role: "researcher",
        status: "active",
        lastLogin: "2025-06-03 14:30:00",
      },
    ]

    this.searchHistory = [
      {
        query: "Honeycrisp apple varieties",
        user: "John Doe",
        timestamp: "2025-06-04 08:45:00",
        results: 23,
      },
      {
        query: "Disease resistant apples",
        user: "Jane Smith",
        timestamp: "2025-06-04 07:30:00",
        results: 45,
      },
      {
        query: "Heritage apple cultivars",
        user: "Bob Wilson",
        timestamp: "2025-06-03 16:20:00",
        results: 12,
      },
    ]

    // Initialize asynchronously
    this.init().catch(error => {
      console.error('Failed to initialize dashboard:', error);
    });
  }

  async init() {
    // Update user information from auth
    await this.updateUserInfo();
    this.refreshUserData(); // Get fresh data from server
    await this.loadSessionInfo();
    this.setupEventHandlers();
    this.updateNotificationBadge();
    this.startSessionTimer(); // Start the live session timer
  }

  startSessionTimer() {
    // Update session status every minute
    this.sessionTimer = setInterval(() => {
      this.updateSessionStatus();
    }, 60000); // Update every minute
    
    // Also update immediately
    this.updateSessionStatus();
    
    // Update more frequently when session is critical (< 1 hour)
    this.criticalTimer = setInterval(() => {
      const sessionInfo = this.authManager?.getSessionInfo();
      if (sessionInfo && sessionInfo.remainingTime < (60 * 60 * 1000)) { // Less than 1 hour
        this.updateSessionStatus();
      }
    }, 10000); // Update every 10 seconds when critical
  }

  updateSessionStatus() {
    const sessionInfo = this.authManager?.getSessionInfo();
    const sessionStatusElement = document.querySelectorAll(".session-value")[2]; // Third session value is session status
    const extendButton = document.getElementById("refreshSessionBtn");
    
    if (!sessionStatusElement) return;
    
    // Clear previous classes
    sessionStatusElement.classList.remove('session-active', 'session-warning', 'session-critical', 'session-expired');
    
    if (!sessionInfo || sessionInfo.isExpired) {
      sessionStatusElement.textContent = "Session expired - please log in again";
      sessionStatusElement.classList.add('session-expired');
      
      // Hide extend button
      if (extendButton) extendButton.style.display = "none";
      
      // Don't automatically redirect - let auth.js handle this more gracefully
      // Just update the UI to show expiry status
      return;
    }
    
    const remainingMs = sessionInfo.remainingTime;
    const remainingDays = Math.floor(remainingMs / (1000 * 60 * 60 * 24));
    const remainingHours = Math.floor((remainingMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const remainingMinutes = Math.floor((remainingMs % (1000 * 60 * 60)) / (1000 * 60));
    
    let statusText = "Session status: Active and secure - ";
    let statusClass = "session-active";
    let showExtendButton = false;
    
    if (remainingDays > 0) {
      statusText += `expires in ${remainingDays} day${remainingDays > 1 ? 's' : ''} and ${remainingHours} hour${remainingHours > 1 ? 's' : ''}`;
      statusClass = "session-active";
    } else if (remainingHours > 0) {
      statusText += `expires in ${remainingHours} hour${remainingHours > 1 ? 's' : ''} and ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      
      if (remainingHours >= 2) {
        statusClass = "session-active";
      } else {
        statusClass = "session-warning";
        showExtendButton = true;
        
        // Show warning notification for sessions expiring in less than 2 hours
        if (!this.sessionWarningShown) {
          this.showMessage(`Your session expires in ${remainingHours} hour${remainingHours > 1 ? 's' : ''} and ${remainingMinutes} minutes. Please save your work.`, "warning");
          this.sessionWarningShown = true;
          
          // Reset warning flag after 30 minutes so it can show again
          setTimeout(() => {
            this.sessionWarningShown = false;
          }, 30 * 60 * 1000);
        }
      }
    } else if (remainingMinutes > 0) {
      statusText += `expires in ${remainingMinutes} minute${remainingMinutes > 1 ? 's' : ''}`;
      statusClass = "session-critical";
      showExtendButton = true;
      
      // Show critical warning for sessions expiring in less than 1 hour
      if (!this.sessionCriticalShown) {
        this.showMessage(`Critical: Your session expires in ${remainingMinutes} minutes! Please save your work immediately.`, "error");
        this.sessionCriticalShown = true;
        
        // Reset critical flag after 10 minutes
        setTimeout(() => {
          this.sessionCriticalShown = false;
        }, 10 * 60 * 1000);
      }
    } else {
      statusText = "Session expires very soon - please save your work and refresh";
      statusClass = "session-expired";
      showExtendButton = true;
    }
    
    sessionStatusElement.textContent = statusText;
    sessionStatusElement.classList.add(statusClass);
    
    // Show/hide extend session button
    if (extendButton) {
      extendButton.style.display = showExtendButton ? "block" : "none";
    }
    
    // Update the page title to show session status for critical/expired sessions
    if (statusClass === "session-critical" || statusClass === "session-expired") {
      if (remainingMinutes > 0) {
        document.title = `(${remainingMinutes}m left) Dashboard - Agricultural and Agri-Food Canada`;
      } else {
        document.title = "(EXPIRED) Dashboard - Agricultural and Agri-Food Canada";
      }
    } else {
      document.title = "Dashboard - Agricultural and Agri-Food Canada";
    }
  }

  // Clean up timers when dashboard is destroyed
  destroy() {
    if (this.sessionTimer) {
      clearInterval(this.sessionTimer);
    }
    if (this.criticalTimer) {
      clearInterval(this.criticalTimer);
    }
  }

  async refreshUserData() {
    try {
      // Get fresh user data from the server
      if (this.authManager?.getToken()) {
        const response = await fetch('/api/auth/profile', {
          headers: {
            'Authorization': `Bearer ${this.authManager.getToken()}`
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.user) {
            // Update the stored user data in AuthManager

            // Refresh the display
            this.updateUserInfo();
          }
        }
      }
    } catch (error) {
      console.error('Failed to refresh user data:', error);
      // Continue with cached data
    }
  }

  async updateUserInfo() {
    // Get fresh user data from AuthManager
    const currentUser = this.authManager?.getUser();
    if (currentUser) {
      this.currentUser.name = currentUser.fullName || currentUser.name || "Guest User";
      this.currentUser.role = currentUser.role || "admin";
    }

    // Update welcome message
    const welcomeSection = document.querySelector('.welcome-section h2');
    if (welcomeSection) {
      welcomeSection.textContent = `Welcome Back, ${this.currentUser.name}`;
    }

    // Update session info username
    const sessionTitle = document.querySelector('.session-info h3');
    if (sessionTitle) {
      sessionTitle.textContent = `Your Current Session, ${this.currentUser.name}`;
    }
    
    // Refresh session information with updated user data
    await this.loadSessionInfo();
  }

  setupEventHandlers() {
    // Action card click handlers
    document.querySelectorAll(".action-card").forEach((card) => {
      card.addEventListener("click", (e) => {
        const action = card.dataset.action
        this.handleActionClick(action)
      })
    })

    // Modal close handlers
    const modal = document.getElementById("actionModal")
    const closeBtn = document.querySelector(".close")

    closeBtn.addEventListener("click", () => {
      modal.style.display = "none"
    })

    window.addEventListener("click", (e) => {
      if (e.target === modal) {
        modal.style.display = "none"
      }
    })
    
    // Session extension button
    const refreshSessionBtn = document.getElementById("refreshSessionBtn");
    if (refreshSessionBtn) {
      refreshSessionBtn.addEventListener("click", () => {
        this.extendSession();
      });
    }
  }

  async extendSession() {
    try {
      // Verify current token with the server
      const response = await fetch('/api/auth/profile', {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (response.ok) {
        // Update the token expiry time
        const newExpiryTime = new Date().getTime() + (7 * 24 * 60 * 60 * 1000); // 7 days from now
        localStorage.setItem('tokenExpiry', newExpiryTime.toString());
        
        // Update session status immediately
        this.updateSessionStatus();
        
        // Hide the extend session button
        document.getElementById("refreshSessionBtn").style.display = "none";
        
        this.showMessage("Session extended successfully for 7 more days", "success");
      } else {
        throw new Error("Session verification failed");
      }
    } catch (error) {
      console.error('Failed to extend session:', error);
      this.showMessage("Failed to extend session. Please log in again.", "error");
      setTimeout(() => {
        window.location.href = 'LoginPage.html';
      }, 2000);
    }
  }

  handleActionClick(action) {
    switch (action) {
      case "manage-permissions":
        this.showManagePermissions()
        break
      case "create-user":
        // Redirect to signup page
        window.location.href = 'signup.html'
        break
      case "search-history":
        this.showSearchHistory()
        break
      case "approve-tasks":
        this.showApproveTasks()
        break
    }
  }

  showModal(title, content) {
    const modal = document.getElementById("actionModal")
    const modalBody = document.getElementById("modalBody")

    modalBody.innerHTML = `
      <h2>${title}</h2>
      ${content}
    `

    modal.style.display = "block"
  }

  async showManagePermissions() {
    try {
      // Show loading state
      this.showModal("Manage Systems Permission", '<div class="loading-spinner">Loading users...</div>');
      
      // Fetch users from backend
      const response = await fetch('/users', {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }
      
      const users = await response.json();
      
      const content = `
        <div class="modal-form">
          <h3>User Management</h3>
          <div class="user-list">
            ${users
              .map(
                (user) => `
              <div class="user-item">
                <div class="user-info">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role">Role: ${user.role} | Status: ${user.isVerified ? 'Verified' : 'Pending'}</div>
                  <div class="user-role">Email: ${user.email}</div>
                  <div class="user-role">Department: ${user.department}</div>
                  <div class="user-role">Last Login: ${user.lastLogin ? new Date(user.lastLogin).toLocaleString() : 'Never'}</div>
                </div>
                <div class="user-actions">
                  <button class="btn btn-primary btn-small" onclick="dashboard.promoteUser('${user.id}')">
                    Promote
                  </button>
                  <button class="btn btn-secondary btn-small" onclick="dashboard.demoteUser('${user.id}')">
                    Demote
                  </button>
                  <button class="btn btn-danger btn-small" onclick="dashboard.suspendUser('${user.id}')">
                    ${user.isVerified ? 'Suspend' : 'Delete'}
                  </button>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;

      this.showModal("Manage Systems Permission", content);
    } catch (error) {
      console.error('Error fetching users:', error);
      this.showMessage('Failed to load users. Please try again.', 'error');
      
      // Fallback to local users array if API fails
      const content = `
        <div class="modal-form">
          <h3>User Management (Local Data)</h3>
          <div class="user-list">
            ${this.users
              .map(
                (user) => `
              <div class="user-item">
                <div class="user-info">
                  <div class="user-name">${user.name}</div>
                  <div class="user-role">Role: ${user.role} | Status: ${user.status}</div>
                  <div class="user-role">Last Login: ${user.lastLogin}</div>
                </div>
                <div class="user-actions">
                  <button class="btn btn-primary btn-small" onclick="dashboard.promoteUser(${user.id})">
                    Promote
                  </button>
                  <button class="btn btn-secondary btn-small" onclick="dashboard.demoteUser(${user.id})">
                    Demote
                  </button>
                  <button class="btn btn-danger btn-small" onclick="dashboard.suspendUser(${user.id})">
                    Suspend
                  </button>
                </div>
              </div>
            `,
              )
              .join("")}
          </div>
        </div>
      `;

      this.showModal("Manage Systems Permission", content);
    }
  }

  showCreateUser() {
    const content = `
      <form class="modal-form" onsubmit="dashboard.createUser(event)">
        <div class="form-group">
          <label for="userName">Full Name</label>
          <input type="text" id="userName" name="userName" required>
        </div>
        
        <div class="form-group">
          <label for="userEmail">Email Address</label>
          <input type="email" id="userEmail" name="userEmail" required>
        </div>
        
        <div class="form-group">
          <label for="userRole">Role</label>
          <select id="userRole" name="userRole" required>
            <option value="">Select Role</option>
            <option value="Viewer">Viewer</option>
            <option value="Researcher">Researcher</option>
            <option value="Administrator">Administrator</option>
          </select>
        </div>
        
        <div class="form-group">
          <label for="userDepartment">Department</label>
          <input type="text" id="userDepartment" name="userDepartment">
        </div>
        
        <div class="form-group">
          <label for="userOrganization">Organization</label>
          <input type="text" id="userOrganization" name="userOrganization">
        </div>
        
        <div class="form-group">
          <label for="userJobTitle">Job Title</label>
          <input type="text" id="userJobTitle" name="userJobTitle">
        </div>
        
        <div class="form-group">
          <label for="userPassword">Temporary Password</label>
          <input type="password" id="userPassword" name="userPassword" placeholder="Leave empty for default password">
          <small>If empty, default password 'TempPassword123!' will be used</small>
        </div>
        
        <div class="form-group">
          <label for="userNotes">Notes</label>
          <textarea id="userNotes" name="userNotes" placeholder="Additional information about the user..."></textarea>
        </div>
        
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="document.getElementById('actionModal').style.display='none'">
            Cancel
          </button>
          <button type="submit" class="btn btn-primary">
            Create User
          </button>
        </div>
      </form>
    `

    this.showModal("Create New User Account", content)
  }

  async showSearchHistory() {
    try {
      // Show loading state
      this.showModal("View Search History", '<div class="loading-spinner">Loading search history...</div>');
      
      // Fetch search history from backend
      const response = await fetch('/api/search-history?limit=100', {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch search history');
      }
      
      const searchHistory = await response.json();
      
      const content = `
        <div class="search-history">
          <h3>Recent Search Activity</h3>
          <div class="search-stats">
            <div class="stat-item">
              <span class="stat-label">Total Searches:</span>
              <span class="stat-value">${searchHistory.length}</span>
            </div>
          </div>
          <div class="search-history-list">
            ${searchHistory.length > 0 ? searchHistory
              .map(
                (search) => `
              <div class="search-item">
                <div class="search-content">
                  <div class="search-query">"${search.query}"</div>
                  <div class="search-meta">
                    <span class="search-user">by ${search.user}</span>
                    <span class="search-date">${new Date(search.timestamp).toLocaleString()}</span>
                    <span class="search-results">(${search.results} results)</span>
                  </div>
                  ${search.filters && Object.keys(search.filters).length > 0 ? 
                    `<div class="search-filters">
                      <small>Filters: ${Object.entries(search.filters).map(([key, value]) => `${key}: ${value}`).join(', ')}</small>
                    </div>` : ''
                  }
                </div>
              </div>
            `,
              )
              .join("") : '<div class="no-searches">No search history found.</div>'}
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-primary" onclick="dashboard.exportSearchHistory()">
            Export History
          </button>
          <button class="btn btn-secondary" onclick="dashboard.clearSearchHistory()">
            Clear History
          </button>
          <button class="btn btn-info" onclick="dashboard.showSearchStats()">
            View Statistics
          </button>
        </div>
      `;

      this.showModal("View Search History", content);
    } catch (error) {
      console.error('Error fetching search history:', error);
      this.showMessage('Failed to load search history. Please try again.', 'error');
      
      // Fallback to local search history if API fails
      const content = `
        <div class="search-history">
          <h3>Recent Search Activity (Local Data)</h3>
          ${this.searchHistory
            .map(
              (search) => `
            <div class="search-item">
              <div>
                <div class="search-query">"${search.query}"</div>
                <div class="search-date">by ${search.user} - ${search.timestamp} (${search.results} results)</div>
              </div>
            </div>
          `,
            )
            .join("")}
        </div>
        
        <div class="form-actions">
          <button class="btn btn-primary" onclick="dashboard.exportSearchHistory()">
            Export History
          </button>
          <button class="btn btn-secondary" onclick="dashboard.clearSearchHistory()">
            Clear History
          </button>
        </div>
      `;

      this.showModal("View Search History", content);
    }
  }

  showApproveTasks() {
    const content = `
      <div class="task-list">
        <h3>Pending Approval Tasks</h3>
        ${this.pendingTasks
          .map(
            (task) => `
          <div class="task-item">
            <div class="task-header">
              <div class="task-title">${task.title}</div>
              <div class="task-status status-pending">PENDING</div>
            </div>
            <div class="task-description">${task.description}</div>
            <div class="task-meta">
              <small>Submitted by: ${task.submittedBy} on ${task.submittedAt}</small>
            </div>
            <div class="task-actions">
              <button class="btn btn-primary btn-small" onclick="dashboard.approveTask(${task.id})">
                Approve
              </button>
              <button class="btn btn-danger btn-small" onclick="dashboard.rejectTask(${task.id})">
                Reject
              </button>
              <button class="btn btn-secondary btn-small" onclick="dashboard.viewTaskDetails(${task.id})">
                View Details
              </button>
            </div>
          </div>
        `,
          )
          .join("")}
      </div>
    `

    this.showModal("Approve Tasks", content)
  }

  // User management functions
  async promoteUser(userId) {
    try {
      // Determine new role based on current role
      const response = await fetch(`/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const user = await response.json();
      let newRole = user.role;
      
      if (user.role === "Viewer") newRole = "Researcher";
      else if (user.role === "Researcher") newRole = "Administrator";
      else {
        this.showMessage(`${user.name} is already at the highest role level`, "warning");
        return;
      }
      
      // Update user role
      const updateResponse = await fetch(`/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update user role');
      }
      
      this.showMessage(`${user.name} has been promoted to ${newRole}`, "success");
      this.showManagePermissions(); // Refresh the view
    } catch (error) {
      console.error('Error promoting user:', error);
      this.showMessage('Failed to promote user. Please try again.', 'error');
    }
  }

  async demoteUser(userId) {
    try {
      // Determine new role based on current role
      const response = await fetch(`/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const user = await response.json();
      let newRole = user.role;
      
      if (user.role === "Administrator") newRole = "Researcher";
      else if (user.role === "Researcher") newRole = "Viewer";
      else {
        this.showMessage(`${user.name} is already at the lowest role level`, "warning");
        return;
      }
      
      // Update user role
      const updateResponse = await fetch(`/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        },
        body: JSON.stringify({ role: newRole })
      });
      
      if (!updateResponse.ok) {
        throw new Error('Failed to update user role');
      }
      
      this.showMessage(`${user.name} has been demoted to ${newRole}`, "warning");
      this.showManagePermissions(); // Refresh the view
    } catch (error) {
      console.error('Error demoting user:', error);
      this.showMessage('Failed to demote user. Please try again.', 'error');
    }
  }

  async suspendUser(userId) {
    try {
      // Get user info first
      const response = await fetch(`/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch user');
      }
      
      const user = await response.json();
      
      // If user is not verified, delete them completely
      if (!user.isVerified) {
        if (confirm(`Are you sure you want to delete ${user.name}? This action cannot be undone.`)) {
          const deleteResponse = await fetch(`/users/${userId}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${this.authManager?.getToken()}`
            }
          });
          
          if (!deleteResponse.ok) {
            throw new Error('Failed to delete user');
          }
          
          this.showMessage(`${user.name} has been deleted`, "warning");
          this.showManagePermissions(); // Refresh the view
        }
      } else {
        // For verified users, we might want to implement a suspension mechanism
        // For now, we'll show a message that this feature needs implementation
        this.showMessage(`Suspension feature for verified users needs to be implemented`, "warning");
      }
    } catch (error) {
      console.error('Error suspending/deleting user:', error);
      this.showMessage('Failed to suspend/delete user. Please try again.', 'error');
    }
  }

  // Task management functions
  approveTask(taskId) {
    const taskIndex = this.pendingTasks.findIndex((t) => t.id === taskId)
    if (taskIndex !== -1) {
      const task = this.pendingTasks[taskIndex]
      this.pendingTasks.splice(taskIndex, 1)
      this.showMessage(`Task "${task.title}" has been approved`, "success")
      this.updateNotificationBadge()
      this.showApproveTasks() // Refresh the view
    }
  }

  rejectTask(taskId) {
    const taskIndex = this.pendingTasks.findIndex((t) => t.id === taskId)
    if (taskIndex !== -1) {
      const task = this.pendingTasks[taskIndex]
      this.pendingTasks.splice(taskIndex, 1)
      this.showMessage(`Task "${task.title}" has been rejected`, "error")
      this.updateNotificationBadge()
      this.showApproveTasks() // Refresh the view
    }
  }

  viewTaskDetails(taskId) {
    const task = this.pendingTasks.find((t) => t.id === taskId)
    if (task) {
      alert(
        `Task Details:\n\nTitle: ${task.title}\nType: ${task.type}\nSubmitted by: ${task.submittedBy}\nDate: ${task.submittedAt}\n\nDescription: ${task.description}`,
      )
    }
  }

  // User creation
  async createUser(event) {
    event.preventDefault();
    
    try {
      const formData = new FormData(event.target);
      const userData = {
        fullName: formData.get("userName"),
        email: formData.get("userEmail"),
        role: formData.get("userRole"),
        department: formData.get("userDepartment"),
        organization: formData.get("userOrganization"),
        jobTitle: formData.get("userJobTitle"),
        password: formData.get("userPassword") || undefined, // Use default if empty
      };

      const response = await fetch('/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        },
        body: JSON.stringify(userData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create user');
      }

      const newUser = await response.json();
      this.showMessage(`User ${userData.fullName} has been created successfully`, "success");
      document.getElementById("actionModal").style.display = "none";
      
    } catch (error) {
      console.error('Error creating user:', error);
      this.showMessage(`Failed to create user: ${error.message}`, 'error');
    }
  }

  // Search history functions
  async showSearchStats() {
    try {
      const response = await fetch('/api/search-stats', {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch search statistics');
      }
      
      const stats = await response.json();
      
      const content = `
        <div class="search-stats-detail">
          <h3>Search Statistics</h3>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-number">${stats.totalSearches}</div>
              <div class="stat-label">Total Searches</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${stats.uniqueUsers}</div>
              <div class="stat-label">Active Users</div>
            </div>
            <div class="stat-card">
              <div class="stat-number">${Math.round(stats.averageResults)}</div>
              <div class="stat-label">Avg Results</div>
            </div>
          </div>
          
          <div class="top-queries">
            <h4>Most Popular Searches</h4>
            <div class="query-list">
              ${stats.topQueries.map((query, index) => `
                <div class="query-item">
                  <span class="query-rank">${index + 1}.</span>
                  <span class="query-text">"${query._id}"</span>
                  <span class="query-count">(${query.count} times)</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        
        <div class="form-actions">
          <button class="btn btn-secondary" onclick="dashboard.showSearchHistory()">
            Back to History
          </button>
        </div>
      `;
      
      this.showModal("Search Statistics", content);
    } catch (error) {
      console.error('Error fetching search statistics:', error);
      this.showMessage('Failed to load search statistics. Please try again.', 'error');
    }
  }

  async exportSearchHistory() {
    try {
      const response = await fetch('/api/search-history?limit=1000', {
        headers: {
          'Authorization': `Bearer ${this.authManager?.getToken()}`
        }
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch search history for export');
      }
      
      const searchHistory = await response.json();
      
      const csvContent =
        "data:text/csv;charset=utf-8," +
        "Query,User,Email,Timestamp,Results,Filters\n" +
        searchHistory
          .map((search) => {
            const filters = search.filters ? Object.entries(search.filters).map(([key, value]) => `${key}:${value}`).join(';') : '';
            return `"${search.query}","${search.user}","${search.userEmail}","${search.timestamp}",${search.results},"${filters}"`;
          })
          .join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `search_history_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showMessage("Search history exported successfully", "success");
    } catch (error) {
      console.error('Error exporting search history:', error);
      // Fallback to local data
      const csvContent =
        "data:text/csv;charset=utf-8," +
        "Query,User,Timestamp,Results\n" +
        this.searchHistory
          .map((search) => `"${search.query}","${search.user}","${search.timestamp}",${search.results}`)
          .join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", "search_history_local.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      this.showMessage("Search history exported (local data)", "warning");
    }
  }

  async clearSearchHistory() {
    if (confirm("Are you sure you want to clear all search history? This action cannot be undone.")) {
      try {
        // Note: You might want to implement a DELETE endpoint for clearing history
        // For now, we'll just show a message
        this.showMessage("Search history clearing is not implemented yet. Contact administrator.", "warning");
      } catch (error) {
        console.error('Error clearing search history:', error);
        this.showMessage("Failed to clear search history", "error");
      }
    }
  }

  // Utility functions
  updateNotificationBadge() {
    const badge = document.querySelector(".notification-badge")
    if (badge) {
      badge.textContent = this.pendingTasks.length
      badge.style.display = this.pendingTasks.length > 0 ? "flex" : "none"
    }
  }

  async loadSessionInfo() {
    // Update session information with current user data
    const sessionItems = document.querySelectorAll(".session-value");
    const currentUser = this.authManager?.getUser();
    
    if (sessionItems.length >= 4) {
      // User Current Session
      sessionItems[0].textContent = `Active session for ${this.currentUser.name} - ${this.currentUser.role} access`;
      
      // Last Login - format the actual last login date
      if (currentUser && currentUser.lastLogin) {
        const lastLoginDate = new Date(currentUser.lastLogin);
        
        // Check if the date is valid
        if (!isNaN(lastLoginDate.getTime())) {
          const now = new Date();
          const timeDiff = now - lastLoginDate;
          const daysDiff = Math.floor(timeDiff / (1000 * 60 * 60 * 24));
          
          let formattedDate;
          
          if (daysDiff === 0) {
            // Today
            formattedDate = `Today at ${lastLoginDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}`;
          } else if (daysDiff === 1) {
            // Yesterday
            formattedDate = `Yesterday at ${lastLoginDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })}`;
          } else if (daysDiff < 7) {
            // This week
            formattedDate = lastLoginDate.toLocaleDateString('en-US', {
              weekday: 'long',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          } else {
            // Older dates
            formattedDate = lastLoginDate.toLocaleString('en-US', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            });
          }
          
          sessionItems[1].textContent = `Last login: ${formattedDate}`;
        } else {
          sessionItems[1].textContent = `Last login: Unable to determine previous login time`;
        }
      } else {
        sessionItems[1].textContent = `Last login: This is your first login session`;
      }
      
      // Session Status - this will be updated by updateSessionStatus()
      sessionItems[2].textContent = "Loading session status...";
      
      // User Permissions
      const permissions = await this.getUserPermissions();
      sessionItems[3].textContent = `User Permissions: ${permissions}`;
    }
  }

  async getUserPermissions() {
    try {
      const currentUser = this.authManager?.getUser();
      if (!currentUser || !currentUser.id) {
        return 'Unable to determine permissions - please log in again';
      }

      const response = await fetch(`/users/${currentUser.id}`, {
        headers: {
          'Authorization': `Bearer ${this.authManager.getToken()}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const permissions = userData.permissions;
        
        // Convert permissions object to a readable format
        const permissionDescriptions = [];
        
        if (permissions.admin) {
          permissionDescriptions.push('Full administrative access');
        }
        
        if (permissions.create) {
          permissionDescriptions.push('Create new entries');
        }
        
        if (permissions.upload) {
          permissionDescriptions.push('Upload files and images');
        }
        
        if (permissions.update) {
          permissionDescriptions.push('Modify existing data');
        }
        
        // If no specific permissions, fall back to role-based description
        if (permissionDescriptions.length === 0) {
          return this.getFallbackPermissions(userData.role);
        }
        
        return permissionDescriptions.join(', ');
      } else {
        // Fallback to role-based permissions if API call fails
        return this.getFallbackPermissions(currentUser.role);
      }
    } catch (error) {
      console.error('Error fetching user permissions:', error);
      // Fallback to role-based permissions
      const currentUser = this.authManager?.getUser();
      return this.getFallbackPermissions(currentUser?.role);
    }
  }

  getFallbackPermissions(role) {
    switch (role) {
      case 'Administrator':
        return 'Full administrative access including user management, database modifications, and system configuration';
      case 'Researcher':
        return 'Data entry, search access, export capabilities, and limited user management';
      case 'Viewer':
        return 'Read-only access to search and view apple variety information';
      default:
        return 'Limited access - please contact administrator for role verification';
    }
  }

  showMessage(message, type) {
    // Create and show a temporary message
    const messageDiv = document.createElement("div")
    messageDiv.className = `message message-${type}`
    messageDiv.textContent = message

    const container = document.querySelector(".dashboard-container")
    container.insertBefore(messageDiv, container.firstChild)

    setTimeout(() => {
      messageDiv.remove()
    }, 5000)
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.dashboard = new DashboardManager();

  // Add fade-in animation
  document.querySelector(".dashboard-main").classList.add("fade-in");
});

// Additional interactive features
document.addEventListener("DOMContentLoaded", () => {
  // Add keyboard shortcuts
  document.addEventListener("keydown", (e) => {
    if (e.ctrlKey || e.metaKey) {
      switch (e.key) {
        case "1":
          e.preventDefault()
          document.querySelector('[data-action="manage-permissions"]').click()
          break
        case "2":
          e.preventDefault()
          document.querySelector('[data-action="create-user"]').click()
          break
        case "3":
          e.preventDefault()
          document.querySelector('[data-action="search-history"]').click()
          break
        case "4":
          e.preventDefault()
          document.querySelector('[data-action="approve-tasks"]').click()
          break
      }
    }
  })

  // Add tooltips to action cards
  const actionCards = document.querySelectorAll(".action-card")
  actionCards.forEach((card, index) => {
    card.title = `Keyboard shortcut: Ctrl+${index + 1}`
  })

  // Add loading states to buttons
  document.addEventListener("click", (e) => {
    if (e.target.classList.contains("btn") && !e.target.classList.contains("btn-secondary")) {
      e.target.classList.add("loading")
      setTimeout(() => {
        e.target.classList.remove("loading")
      }, 1000)
    }
  })
})
