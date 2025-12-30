class TeamEditor {
  constructor() {
    this.isEditMode = false;
    this.currentEditingMember = null;
    this.teamData = this.loadTeamData();
    this.init();
  }

  init() {
    this.bindEvents();
    this.loadTeamFromStorage();
  }

  bindEvents() {
    // Edit mode toggle
    document.getElementById('editModeBtn').addEventListener('click', () => {
      this.toggleEditMode();
    });

    // Modal events
    document.querySelector('.close').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('cancelEdit').addEventListener('click', () => {
      this.closeModal();
    });

    document.getElementById('saveChanges').addEventListener('click', () => {
      this.saveChanges();
    });

    // Photo preview
    document.getElementById('memberPhoto').addEventListener('change', (e) => {
      this.previewPhoto(e);
    });

    // Hidden file input for direct photo editing
    document.getElementById('hiddenFileInput').addEventListener('change', (e) => {
      this.handleDirectPhotoChange(e);
    });

    // Close modal when clicking outside
    window.addEventListener('click', (e) => {
      const modal = document.getElementById('editModal');
      if (e.target === modal) {
        this.closeModal();
      }
    });
  }

  toggleEditMode() {
    this.isEditMode = !this.isEditMode;
    const editBtn = document.getElementById('editModeBtn');
    const teamMembers = document.querySelectorAll('.team-member');
    
    if (this.isEditMode) {
      editBtn.textContent = 'Exit Edit';
      editBtn.classList.add('active');
      
      teamMembers.forEach(member => {
        member.classList.add('edit-mode');
        
        // Show edit buttons
        const editBtn = member.querySelector('.edit-member-btn');
        const photoBtn = member.querySelector('.edit-photo-btn');
        
        editBtn.style.display = 'flex';
        photoBtn.style.display = 'flex';
        
        // Add event listeners
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openEditModal(member);
        });
        
        photoBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          this.openPhotoSelector(member);
        });
      });
    } else {
      editBtn.textContent = 'Edit Team';
      editBtn.classList.remove('active');
      
      teamMembers.forEach(member => {
        member.classList.remove('edit-mode');
        
        // Hide edit buttons
        const editBtn = member.querySelector('.edit-member-btn');
        const photoBtn = member.querySelector('.edit-photo-btn');
        
        editBtn.style.display = 'none';
        photoBtn.style.display = 'none';
      });
    }
  }

  openEditModal(memberElement) {
    this.currentEditingMember = memberElement;
    const memberId = memberElement.dataset.memberId;
    const memberData = this.teamData[memberId];
    
    // Populate modal with current data
    document.getElementById('memberName').value = memberData.name;
    document.getElementById('memberTitle').value = memberData.title;
    
    // Clear photo preview
    const photoPreview = document.getElementById('photoPreview');
    photoPreview.style.display = 'none';
    document.getElementById('memberPhoto').value = '';
    
    // Show modal
    document.getElementById('editModal').style.display = 'block';
  }

  openPhotoSelector(memberElement) {
    this.currentEditingMember = memberElement;
    const hiddenInput = document.getElementById('hiddenFileInput');
    hiddenInput.click();
  }

  handleDirectPhotoChange(event) {
    const file = event.target.files[0];
    if (file && this.currentEditingMember) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = this.currentEditingMember.querySelector('.member-photo img');
        img.src = e.target.result;
        
        // Update team data
        const memberId = this.currentEditingMember.dataset.memberId;
        this.teamData[memberId].photo = e.target.result;
        this.saveTeamData();
      };
      reader.readAsDataURL(file);
    }
  }

  previewPhoto(event) {
    const file = event.target.files[0];
    const preview = document.getElementById('photoPreview');
    
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        preview.src = e.target.result;
        preview.style.display = 'block';
      };
      reader.readAsDataURL(file);
    } else {
      preview.style.display = 'none';
    }
  }

  saveChanges() {
    if (!this.currentEditingMember) return;
    
    const memberId = this.currentEditingMember.dataset.memberId;
    const name = document.getElementById('memberName').value.trim();
    const title = document.getElementById('memberTitle').value.trim();
    const photoFile = document.getElementById('memberPhoto').files[0];
    
    if (!name || !title) {
      alert('Please fill in both name and title fields.');
      return;
    }
    
    // Update team data
    this.teamData[memberId].name = name;
    this.teamData[memberId].title = title;
    
    // Update DOM
    const nameElement = this.currentEditingMember.querySelector('.member-name');
    const titleElement = this.currentEditingMember.querySelector('.member-title');
    
    nameElement.textContent = name;
    titleElement.textContent = title;
    
    // Handle photo if uploaded
    if (photoFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = this.currentEditingMember.querySelector('.member-photo img');
        img.src = e.target.result;
        this.teamData[memberId].photo = e.target.result;
        this.saveTeamData();
      };
      reader.readAsDataURL(photoFile);
    } else {
      this.saveTeamData();
    }
    
    this.closeModal();
    this.showNotification('Team member updated successfully!');
  }

  closeModal() {
    document.getElementById('editModal').style.display = 'none';
    this.currentEditingMember = null;
  }

  loadTeamData() {
    // Default team data
    return {
      0: { name: 'John Smith', title: 'Senior Researcher', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team1-NSu6vBlCr3KcAhukFOpK4NCJruNo6T.png' },
      1: { name: 'Sarah Johnson', title: 'Data Analyst', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team2-1bJqSZ6gIQpNqtZOO5TeiJX0rPqGKd.png' },
      2: { name: 'Michael Brown', title: 'Project Manager', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team3-k3us07lTf8vAsRJrvrYHPDariagfWI.png' },
      3: { name: 'Emily Davis', title: 'Agricultural Specialist', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team4-L9nBELelJSI60zhAMD6mrlQ3WSvfm7.png' },
      4: { name: 'Robert Wilson', title: 'Research Coordinator', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team5-FJZNJHmalCXdVxvI9Fl6l9J6u0pfWo.png' },
      5: { name: 'Lisa Anderson', title: 'Quality Assurance', photo: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/team1-NSu6vBlCr3KcAhukFOpK4NCJruNo6T.png' }
    };
  }

  loadTeamFromStorage() {
    const savedData = localStorage.getItem('teamData');
    if (savedData) {
      this.teamData = JSON.parse(savedData);
      this.updateTeamDisplay();
    }
  }

  saveTeamData() {
    localStorage.setItem('teamData', JSON.stringify(this.teamData));
  }

  updateTeamDisplay() {
    Object.keys(this.teamData).forEach(memberId => {
      const memberElement = document.querySelector(`[data-member-id="${memberId}"]`);
      if (memberElement) {
        const data = this.teamData[memberId];
        
        memberElement.querySelector('.member-name').textContent = data.name;
        memberElement.querySelector('.member-title').textContent = data.title;
        memberElement.querySelector('.member-photo img').src = data.photo;
      }
    });
  }

  showNotification(message) {
    // Create notification element
    const notification = document.createElement('div');
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background-color: #28a745;
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
    
    // Fade in
    setTimeout(() => {
      notification.style.opacity = '1';
    }, 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
      notification.style.opacity = '0';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }
}

// Original functionality from your script
class ImageSlider {
  constructor() {
    this.slides = document.querySelectorAll(".slides img")
    this.dots = document.querySelectorAll(".dot")
    this.prevBtn = document.querySelector(".prev")
    this.nextBtn = document.querySelector(".next")
    this.currentSlide = 0
    this.slideInterval = null

    if (this.slides.length > 0) {
      this.init()
    }
  }

  init() {
    // Add event listeners
    if (this.prevBtn) this.prevBtn.addEventListener("click", () => this.prevSlide())
    if (this.nextBtn) this.nextBtn.addEventListener("click", () => this.nextSlide())

    // Add dot navigation
    this.dots.forEach((dot, index) => {
      dot.addEventListener("click", () => this.goToSlide(index))
    })

    // Auto-play slider
    this.startAutoPlay()

    // Pause on hover
    const slider = document.querySelector(".slider")
    if (slider) {
      slider.addEventListener("mouseenter", () => this.stopAutoPlay())
      slider.addEventListener("mouseleave", () => this.startAutoPlay())
    }

    // Keyboard navigation
    document.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") this.prevSlide()
      if (e.key === "ArrowRight") this.nextSlide()
    })
  }

  updateSlide() {
    // Update images
    this.slides.forEach((slide, index) => {
      slide.classList.toggle("active", index === this.currentSlide)
    })

    // Update dots (only for actual slides, not all dots)
    this.dots.forEach((dot, index) => {
      if (index < this.slides.length) {
        dot.classList.toggle("active", index === this.currentSlide)
      }
    })
  }

  nextSlide() {
    this.currentSlide = (this.currentSlide + 1) % this.slides.length
    this.updateSlide()
  }

  prevSlide() {
    this.currentSlide = (this.currentSlide - 1 + this.slides.length) % this.slides.length
    this.updateSlide()
  }

  goToSlide(index) {
    if (index < this.slides.length) {
      this.currentSlide = index
      this.updateSlide()
    }
  }

  startAutoPlay() {
    this.slideInterval = setInterval(() => this.nextSlide(), 5000)
  }

  stopAutoPlay() {
    if (this.slideInterval) {
      clearInterval(this.slideInterval)
      this.slideInterval = null
    }
  }
}

// Smooth scroll functionality
function smoothScrollToTop() {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  })
}

// Initialize when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  // Initialize team editor
  new TeamEditor();
  
  // Initialize slider if it exists
  new ImageSlider()

  // Scroll to top button
  const scrollTopBtn = document.querySelector(".scroll-top")
  if (scrollTopBtn) {
    scrollTopBtn.addEventListener("click", smoothScrollToTop)

    // Show/hide scroll button based on scroll position
    window.addEventListener("scroll", () => {
      if (window.scrollY > 300) {
        scrollTopBtn.style.display = "block"
      } else {
        scrollTopBtn.style.display = "none"
      }
    })
  }

  // Add smooth scrolling to navigation links
  document.querySelectorAll('nav a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })

  // Add loading animation
  document.body.style.opacity = "0"
  setTimeout(() => {
    document.body.style.transition = "opacity 0.5s ease-in-out"
    document.body.style.opacity = "1"
  }, 100)

  // Add hover effects to buttons
  const buttons = document.querySelectorAll(".action-btn")
  buttons.forEach((btn) => {
    btn.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-2px)"
    })

    btn.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)"
    })
  })

  // Add click animations
  buttons.forEach((btn) => {
    btn.addEventListener("click", function (e) {
      // Create ripple effect
      const ripple = document.createElement("span")
      const rect = this.getBoundingClientRect()
      const size = Math.max(rect.width, rect.height)
      const x = e.clientX - rect.left - size / 2
      const y = e.clientY - rect.top - size / 2

      ripple.style.cssText = `
        position: absolute;
        width: ${size}px;
        height: ${size}px;
        left: ${x}px;
        top: ${y}px;
        background: rgba(255,255,255,0.5);
        border-radius: 50%;
        transform: scale(0);
        animation: ripple 0.6s linear;
        pointer-events: none;
      `

      this.style.position = "relative"
      this.style.overflow = "hidden"
      this.appendChild(ripple)

      setTimeout(() => ripple.remove(), 600)
    })
  })

  // Add fade-in animation to main content
  const mainContent = document.querySelector("main")
  if (mainContent) {
    mainContent.classList.add("fade-in")
  }

  // Add smooth scrolling for any anchor links
  document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
    anchor.addEventListener("click", function (e) {
      e.preventDefault()
      const target = document.querySelector(this.getAttribute("href"))
      if (target) {
        target.scrollIntoView({
          behavior: "smooth",
          block: "start",
        })
      }
    })
  })

  // Add interactive hover effects to team members
  const teamMembers = document.querySelectorAll(".team-member")
  teamMembers.forEach((member) => {
    member.addEventListener("mouseenter", function () {
      this.style.transform = "translateY(-3px)"
      this.style.transition = "transform 0.3s ease"
    })

    member.addEventListener("mouseleave", function () {
      this.style.transform = "translateY(0)"
    })
  })

  // Add navigation active state management
  const navLinks = document.querySelectorAll("nav a")
  navLinks.forEach((link) => {
    link.addEventListener("click", function (e) {
      // Remove active class from all links
      navLinks.forEach((l) => l.classList.remove("active"))
      // Add active class to clicked link
      this.classList.add("active")
    })
  })

  // Add contact us functionality
  const contactLink = document.querySelector(".footer-left")
  if (contactLink) {
    contactLink.addEventListener("click", () => {
      // Placeholder for contact functionality
      alert("Contact form would open here")
    })

    // Make it look clickable
    contactLink.style.cursor = "pointer"
  }

  // Add scroll-to-top functionality when clicking header
  const headerTitle = document.querySelector(".header-left h1")
  if (headerTitle) {
    headerTitle.addEventListener("click", () => {
      window.scrollTo({
        top: 0,
        behavior: "smooth",
      })
    })

    headerTitle.style.cursor = "pointer"
  }

  // Add responsive navigation toggle for mobile (if needed in future)
  function handleResize() {
    const nav = document.querySelector("nav")
    if (nav) {
      if (window.innerWidth <= 768) {
        nav.classList.add("mobile-nav")
      } else {
        nav.classList.remove("mobile-nav")
      }
    }
  }

  window.addEventListener("resize", handleResize)
  handleResize() // Call on initial load

  // Add loading state management
  window.addEventListener("load", () => {
    document.body.classList.add("loaded")
  })

  // Add keyboard navigation support
  document.addEventListener("keydown", (e) => {
    // Tab navigation enhancement
    if (e.key === "Tab") {
      document.body.classList.add("keyboard-navigation")
    }
  })

  document.addEventListener("mousedown", () => {
    document.body.classList.remove("keyboard-navigation")
  })
})

// Add CSS animation for ripple effect
const style = document.createElement("style")
style.textContent = `
  @keyframes ripple {
    to {
      transform: scale(4);
      opacity: 0;
    }
  }
`
document.head.appendChild(style)

// Utility functions
function showNotification(message, type = "info") {
  // Future: Could implement toast notifications
  console.log(`${type.toUpperCase()}: ${message}`)
}

function validateForm(formData) {
  // Future: Form validation utility
  return true
}

// Export functions for potential future use
window.AppleExplorer = {
  showNotification,
  validateForm,
}