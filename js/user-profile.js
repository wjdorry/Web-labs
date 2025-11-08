import { getCurrentUser, onSessionChange, clearCurrentUser, API_BASE } from './session.js';

const elements = {
  profileIcon: null,
  logoutButton: null,
  profileModal: null,
  profileForm: null,
  profileFirstName: null,
  profileLastName: null,
  profileMiddleName: null,
  profilePhone: null,
  profileEmail: null,
  profileDob: null,
  profileNickname: null,
  profileClose: null,
  profileCancel: null,
  profileSave: null,
  signInLink: null
};

const state = {
  currentUser: null,
  isSaving: false
};

function formatPhoneForDisplay(value) {
  if (!value) return '';
  const digits = value.replace(/\D/g, '');
  if (digits.startsWith('375') && digits.length === 12) {
    const operator = digits.slice(3, 5);
    const rest = digits.slice(5);
    return `+375 ${operator} ${rest.slice(0, 3)}-${rest.slice(3, 5)}-${rest.slice(5)}`;
  }
  return value;
}

function showProfileModal() {
  if (!elements.profileModal) return;
  
  if (typeof elements.profileModal.showModal === 'function') {
    elements.profileModal.showModal();
  } else {
    elements.profileModal.setAttribute('open', '');
  }
  
  populateProfileForm();
}

function closeProfileModal() {
  if (!elements.profileModal) return;
  
  if (elements.profileModal.open) {
    elements.profileModal.close();
  } else {
    elements.profileModal.removeAttribute('open');
  }
}

function populateProfileForm() {
  const user = state.currentUser;
  if (!user) return;
  
  if (elements.profileFirstName) elements.profileFirstName.value = user.firstName || '';
  if (elements.profileLastName) elements.profileLastName.value = user.lastName || '';
  if (elements.profileMiddleName) elements.profileMiddleName.value = user.middleName || '';
  if (elements.profilePhone) elements.profilePhone.value = formatPhoneForDisplay(user.phone || user.phoneFormatted || '');
  if (elements.profileEmail) elements.profileEmail.value = user.email || '';
  if (elements.profileDob) elements.profileDob.value = user.dateOfBirth || '';
  if (elements.profileNickname) elements.profileNickname.value = user.nickname || '';
}

async function saveProfileChanges(event) {
  event.preventDefault();
  if (state.isSaving || !state.currentUser) return;
  
  state.isSaving = true;
  
  if (elements.profileSave) {
    elements.profileSave.disabled = true;
    elements.profileSave.textContent = 'Saving...';
  }
  
  try {
    const updatedData = {
      firstName: elements.profileFirstName?.value || '',
      lastName: elements.profileLastName?.value || '',
      middleName: elements.profileMiddleName?.value || '',
      phone: elements.profilePhone?.value || '',
      email: elements.profileEmail?.value || '',
      dateOfBirth: elements.profileDob?.value || '',
      nickname: elements.profileNickname?.value || ''
    };
    
    // Update fullName if first/last name changed
    if (updatedData.firstName || updatedData.lastName || updatedData.middleName) {
      updatedData.fullName = [
        updatedData.lastName,
        updatedData.firstName,
        updatedData.middleName
      ]
        .filter(Boolean)
        .join(' ');
    }
    
    const response = await fetch(`${API_BASE}/users/${state.currentUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData)
    });
    
    if (!response.ok) throw new Error(`Failed to update profile: ${response.status}`);
    
    const updatedUser = await response.json();
    const { passwordHash: _, ...userWithoutHash } = updatedUser;
    
    // Update LocalStorage
    localStorage.setItem('lawshop.currentUser', JSON.stringify(userWithoutHash));
    state.currentUser = userWithoutHash;
    
    showToast('Profile updated successfully!');
    closeProfileModal();
  } catch (error) {
    console.error('Error updating profile:', error);
    showToast('Failed to update profile. Please try again.');
  } finally {
    state.isSaving = false;
    if (elements.profileSave) {
      elements.profileSave.disabled = false;
      elements.profileSave.textContent = 'Save changes';
    }
  }
}

function logout() {
  if (confirm('Are you sure you want to sign out?')) {
    clearCurrentUser();
    window.location.href = 'index.html';
  }
}

function updateAuthUI(user) {
  state.currentUser = user;
  
  const isLoggedIn = !!user;
  
  // Toggle profile icon visibility
  if (elements.profileIcon) {
    elements.profileIcon.style.display = isLoggedIn ? 'flex' : 'none';
  }
  
  // Toggle logout button visibility
  if (elements.logoutButton) {
    elements.logoutButton.style.display = isLoggedIn ? 'block' : 'none';
  }
  
  // Toggle "Sign in" link visibility
  elements.signInLink.forEach(link => {
    link.style.display = isLoggedIn ? 'none' : 'inline-flex';
  });
}

let toastTimer = null;

function showToast(message) {
  const toast = document.getElementById('user-toast');
  if (!toast) {
    console.log(message);
    return;
  }
  
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('is-visible');
  }, 3000);
}

function registerEventListeners() {
  if (elements.profileIcon) {
    elements.profileIcon.addEventListener('click', showProfileModal);
  }
  
  if (elements.logoutButton) {
    elements.logoutButton.addEventListener('click', logout);
  }
  
  if (elements.profileClose || elements.profileCancel) {
    const closeModal = () => closeProfileModal();
    if (elements.profileClose) elements.profileClose.addEventListener('click', closeModal);
    if (elements.profileCancel) elements.profileCancel.addEventListener('click', closeModal);
  }
  
  if (elements.profileModal) {
    elements.profileModal.addEventListener('cancel', (event) => {
      event.preventDefault();
      closeProfileModal();
    });
  }
  
  if (elements.profileForm) {
    elements.profileForm.addEventListener('submit', saveProfileChanges);
  }
}

function initUserProfile() {
  // Initialize elements safely
  elements.profileIcon = document.getElementById('user-profile-icon');
  elements.logoutButton = document.getElementById('user-logout');
  elements.profileModal = document.getElementById('user-profile-modal');
  elements.profileForm = document.getElementById('user-profile-form');
  elements.profileFirstName = document.getElementById('profile-first-name');
  elements.profileLastName = document.getElementById('profile-last-name');
  elements.profileMiddleName = document.getElementById('profile-middle-name');
  elements.profilePhone = document.getElementById('profile-phone');
  elements.profileEmail = document.getElementById('profile-email');
  elements.profileDob = document.getElementById('profile-dob');
  elements.profileNickname = document.getElementById('profile-nickname');
  elements.profileClose = document.getElementById('profile-modal-close');
  elements.profileCancel = document.getElementById('profile-modal-cancel');
  elements.profileSave = document.getElementById('profile-modal-save');
  elements.signInLink = document.querySelectorAll('.menu__link[href="auth.html"]');
  
  registerEventListeners();
  updateAuthUI(getCurrentUser());
  onSessionChange(updateAuthUI);
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initUserProfile);
} else {
  initUserProfile();
}

