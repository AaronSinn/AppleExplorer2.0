// homepage-script.js

// ================================
// Team Editor
// ================================
class TeamEditor {
  constructor() {
    this.isEditMode = false;
    this.currentEditingMember = null;

    this.defaultTeamData = {
      0: { name: 'Kevin Bui', title: 'Frontend', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team1-NSu6vBlCr3KcAhukFOpK4NCJruNo6T.png' },
      1: { name: 'Maria Aguirre', title: 'Frontend', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team2-1bJqSZ6gIQpNqtZOO5TeiJX0rPqGKd.png' },
      2: { name: 'Raad Islam', title: 'Backend/Frontend', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team3-k3us07lTf8vAsRJrvrYHPDariagfWI.png' },
      3: { name: 'Aaron Sinn', title: 'Backend', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team5-FJZNJHmalCXdVxvI9Fl6l9J6u0pfWo.png' }
    };

    this.teamData = this.loadTeamFromStorage();

    this.canEdit = window.authManager && window.authManager.hasPermission
      ? window.authManager.hasPermission('edit')
      : false;

    this.init();
    this.updateTeamDisplay();
  }

  init() {
    // Edit mode button
    const editBtn = document.getElementById('editModeBtn');
    if (editBtn) editBtn.addEventListener('click', () => this.toggleEditMode());

    // Member edit buttons
    document.querySelectorAll('.edit-member-btn').forEach(btn =>
      btn.addEventListener('click', (e) => this.openEditModal(e))
    );

    // Photo edit buttons
    document.querySelectorAll('.edit-photo-btn').forEach(btn =>
      btn.addEventListener('click', (e) => this.openPhotoEditor(e))
    );

    // Modal buttons
    const saveBtn = document.getElementById('saveChanges');
    const cancelBtn = document.getElementById('cancelEdit');

    if (saveBtn) saveBtn.addEventListener('click', () => this.saveChanges());
    if (cancelBtn) cancelBtn.addEventListener('click', () => this.closeModal());

    // Close modal on "x"
    const modalClose = document.querySelector('#editModal .close');
    if (modalClose) modalClose.addEventListener('click', () => this.closeModal());
  }

  loadTeamFromStorage() {
    const savedData = localStorage.getItem('teamData');
    if (savedData) {
      try {
        return JSON.parse(savedData);
      } catch (e) {
        console.error('Error parsing team data from storage:', e);
      }
    }
    return { ...this.defaultTeamData };
  }

  saveTeamData() {
    localStorage.setItem('teamData', JSON.stringify(this.teamData));
  }

  updateTeamDisplay() {
    Object.keys(this.teamData).forEach(memberId => {
      const memberEl = document.querySelector(`[data-member-id="${memberId}"]`);
      if (!memberEl) return;
      const data = this.teamData[memberId];
      memberEl.querySelector('.member-name').textContent = data.name;
      memberEl.querySelector('.member-title').textContent = data.title;
      const imgEl = memberEl.querySelector('.member-photo img');
      if (imgEl) imgEl.src = data.photo;
    });
  }

  toggleEditMode() {
    if (!this.canEdit) return alert('You do not have permission to edit the team.');

    this.isEditMode = !this.isEditMode;
    const editBtn = document.getElementById('editModeBtn');
    const members = document.querySelectorAll('.team-member');

    if (this.isEditMode) {
      editBtn.textContent = 'Exit Edit';
      editBtn.classList.add('active');
      members.forEach(m => {
        m.classList.add('edit-mode');
        m.querySelector('.edit-member-btn').style.display = 'flex';
        m.querySelector('.edit-photo-btn').style.display = 'flex';
      });
    } else {
      editBtn.textContent = 'Edit Team';
      editBtn.classList.remove('active');
      members.forEach(m => {
        m.classList.remove('edit-mode');
        m.querySelector('.edit-member-btn').style.display = 'none';
        m.querySelector('.edit-photo-btn').style.display = 'none';
      });
    }
  }

  openEditModal(e) {
    if (!this.canEdit) return;

    const memberEl = e.target.closest('.team-member');
    if (!memberEl) return;

    const memberId = memberEl.dataset.memberId;
    this.currentEditingMember = memberId;

    const memberData = this.teamData[memberId] || {};
    document.getElementById('memberName').value = memberData.name || '';
    document.getElementById('memberTitle').value = memberData.title || '';
    document.getElementById('photoPreview').style.display = 'none';

    document.getElementById('editModal').style.display = 'block';
  }

  openPhotoEditor(e) {
    if (!this.canEdit) return;

    const fileInput = document.getElementById('hiddenFileInput');
    const memberEl = e.target.closest('.team-member');
    if (!memberEl) return;

    this.currentEditingMember = memberEl.dataset.memberId;

    fileInput.onchange = (event) => {
      const file = event.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (ev) => {
        const imgEl = memberEl.querySelector('img');
        if (imgEl) imgEl.src = ev.target.result;

        this.teamData[this.currentEditingMember] = this.teamData[this.currentEditingMember] || {};
        this.teamData[this.currentEditingMember].photo = ev.target.result;
        this.saveTeamData();
      };
      reader.readAsDataURL(file);
    };
    fileInput.click();
  }

  closeModal() {
    document.getElementById('editModal').style.display = 'none';
  }

  saveChanges() {
    if (!this.canEdit) return;

    const name = document.getElementById('memberName').value;
    const title = document.getElementById('memberTitle').value;

    const memberEl = document.querySelector(`[data-member-id="${this.currentEditingMember}"]`);
    if (memberEl) {
      memberEl.querySelector('.member-name').textContent = name;
      memberEl.querySelector('.member-title').textContent = title;

      this.teamData[this.currentEditingMember] = this.teamData[this.currentEditingMember] || {};
      this.teamData[this.currentEditingMember].name = name;
      this.teamData[this.currentEditingMember].title = title;
      this.saveTeamData();

      this.showNotification('Team member updated successfully!');
      this.updateTeamDisplay();
    }

    this.closeModal();
  }

  showNotification(message, type = "success") {
    const colors = { success: "#28a745", error: "#dc3545", info: "#007bff" };
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: ${colors[type] || colors.info};
      color: white;
      padding: 15px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      z-index: 1001;
      font-size: 14px;
      opacity: 0;
      transition: opacity 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);

    setTimeout(() => notification.style.opacity = "1", 100);
    setTimeout(() => {
      notification.style.opacity = "0";
      setTimeout(() => notification.remove(), 300);
    }, 3000);
  }
}

// ================================
// DOMContentLoaded: Initialize everything
// ================================
document.addEventListener("DOMContentLoaded", () => {
  // Initialize Team Editor
  window.teamEditor = new TeamEditor();

  // Global AppleExplorer for notifications
  window.AppleExplorer = window.AppleExplorer || {};
  window.AppleExplorer.showNotification = (msg, type = "info") => window.teamEditor.showNotification(msg, type);

  // ------------------------
  // Authentication link update
  // ------------------------
  const authLink = document.getElementById('auth-link');
  const guestActions = document.getElementById('guest-actions');
  const userActions = document.getElementById('user-actions');

  function updateAuthDisplay() {
    if (window.authManager && window.authManager.isAuthenticated()) {
      if (authLink) {
        authLink.textContent = 'LOGOUT';
        authLink.href = '#';
        authLink.onclick = (e) => { e.preventDefault(); window.authManager.logout(); };
      }
      if (guestActions) guestActions.style.display = 'none';
      if (userActions) userActions.style.display = 'block';
    } else {
      if (authLink) {
        authLink.textContent = 'LOGIN';
        authLink.href = 'LoginPage.html';
        authLink.onclick = null;
      }
      if (guestActions) guestActions.style.display = 'block';
      if (userActions) userActions.style.display = 'none';
    }
  }
  updateAuthDisplay();
  if (window.authManager) setInterval(updateAuthDisplay, 1000);

  // ------------------------
  // Contact Modal
  // ------------------------
  const contactModal = document.getElementById("contactModal");
  const contactForm = document.getElementById("contactForm");
  const contactClose = document.getElementById("contactClose");
  const contactCancel = document.getElementById("contactCancel");
  const contactTrigger = document.querySelector(".footer-left");

  if (contactTrigger && contactModal) {
    contactTrigger.style.cursor = "pointer";
    contactTrigger.addEventListener("click", () => contactModal.style.display = "block");
  }

  function closeContactModal() {
    if (contactModal) contactModal.style.display = "none";
    if (contactForm) contactForm.reset();
  }

  if (contactClose) contactClose.addEventListener("click", closeContactModal);
  if (contactCancel) contactCancel.addEventListener("click", closeContactModal);

  window.addEventListener("click", (event) => {
    if (event.target === contactModal) closeContactModal();
  });

  if (contactForm) {
    contactForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const name = document.getElementById("contactName").value.trim();
      const email = document.getElementById("contactEmail").value.trim();
      const message = document.getElementById("contactMessage").value.trim();

      if (!name || !email || !message) {
        window.AppleExplorer.showNotification("Please fill in all fields", "error");
        return;
      }

      console.log("Contact Form Submission:", { name, email, message });
      window.AppleExplorer.showNotification("Your message has been sent!", "success");
      contactForm.reset();
      closeContactModal();
    });
  }

  // ------------------------
  // Terms & Conditions Modal
  // ------------------------
  const termsModal = document.getElementById("termsModal");
  const termsTrigger = document.getElementById("termsTrigger");
  const termsClose = document.getElementById("termsClose");
  const termsCancel = document.getElementById("termsCancel");

  if (termsTrigger && termsModal) {
    termsTrigger.style.cursor = "pointer";
    termsTrigger.addEventListener("click", () => termsModal.style.display = "block");
  }

  function closeTermsModal() {
    if (termsModal) termsModal.style.display = "none";
  }

  if (termsClose) termsClose.addEventListener("click", closeTermsModal);
  if (termsCancel) termsCancel.addEventListener("click", closeTermsModal);

  window.addEventListener("click", (event) => {
    if (event.target === termsModal) closeTermsModal();
  });

});
