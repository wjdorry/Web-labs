import { API_BASE, getCurrentUser, setCurrentUser } from './session.js';

const ENDPOINTS = {
  users: `${API_BASE}/users`
};

const TOP_PASSWORDS_2024 = new Set([
  '123456', 'admin', '123456789', '12345', 'qwerty', 'password', '12345678', '111111', '123123', 'abc123',
  '1234567890', '1234', 'iloveyou', '1q2w3e', '123321', 'qwerty123', '000000', 'password1', '123', 'qazwsx',
  '123qwe', 'dragon', 'sunshine', 'letmein', 'monkey', 'princess', 'trustno1', 'welcome', 'football', 'baseball',
  'solo', 'password123', 'passw0rd', 'admin123', 'qwertyuiop', 'login', 'asdfghjkl', '1qaz2wsx', 'zxcvbn', 'freedom',
  'whatever', 'qwerty1', '696969', 'zaq12wsx', 'starwars', 'shadow', 'michael', 'superman', 'ninja', 'azerty',
  '121212', 'batman', 'master', 'hello123', 'photoshop', '7777777', '1password', 'qwert', 'killer', 'killer123',
  'pokemon', 'naruto', '88888888', 'football1', 'internet', 'letmein123', 'love', 'flower', 'zaq1xsw2', '987654321',
  '1234567', 'qwerty12', 'pass123', 'pass1234', 'pass12345', 'qwe123', 'qweasdzxc', 'zaq123', 'secret', '00000000',
  '1g2w3e4r', 'zxcvbnm', 'asd123', 'myspace1', 'charlie', 'bailey', '987654', '11111111', '555555', 'hello', 'lovely',
  'midnight', 'pepper', 'ginger', 'welcome1', 'summer', 'ashley', 'football123', 'admin1', 'matrix', 'merlin'
]);

const BELARUS_OPERATORS = new Set(['17', '25', '29', '33', '44']);

const PASSWORD_LIMITS = { min: 8, max: 20 };
const MAX_NICKNAME_REGENERATIONS = 5;

const state = {
  registration: {
    passwordMode: 'manual',
    nicknameAttempts: 0,
    manualNicknameEnabled: false,
    generatedNickname: '',
    generatedPassword: '',
    agreementRead: false,
    emailCheckCache: null,
    nicknameCheckCache: null,
    pendingNicknameGeneration: null
  },
  isSubmitting: false
};

const elements = {
  tabs: document.querySelectorAll('.auth-tab'),
  panels: document.querySelectorAll('.auth-panel'),
  registerForm: document.getElementById('registration-form'),
  loginForm: document.getElementById('login-form'),
  toast: document.getElementById('auth-toast'),
  agreementModal: document.getElementById('agreement-modal'),
  agreementContent: document.getElementById('agreement-content'),
  agreementMarkRead: document.querySelector('[data-action="agreement-mark-read"]'),
  agreementCloseButtons: document.querySelectorAll('[data-action="agreement-close"]'),
  openAgreementButtons: document.querySelectorAll('[data-action="open-agreement"]'),
  nicknameRefresh: document.querySelector('[data-action="nickname-refresh"]'),
  passwordRegenerate: document.querySelector('[data-action="password-regenerate"]'),
  switchToRegisterLinks: document.querySelectorAll('[data-action="switch-register"]'),
  registrationFields: {
    lastName: document.getElementById('reg-last-name'),
    firstName: document.getElementById('reg-first-name'),
    middleName: document.getElementById('reg-middle-name'),
    phone: document.getElementById('reg-phone'),
    email: document.getElementById('reg-email'),
    dob: document.getElementById('reg-dob'),
    password: document.getElementById('reg-password'),
    passwordConfirm: document.getElementById('reg-password-confirm'),
    passwordAuto: document.getElementById('reg-password-auto'),
    nickname: document.getElementById('reg-nickname'),
    nicknameManualWrapper: document.getElementById('nickname-manual-wrapper'),
    nicknameManual: document.getElementById('reg-nickname-manual'),
    agreement: document.getElementById('reg-agreement'),
    submit: document.getElementById('reg-submit'),
    passwordMode: document.querySelectorAll('input[name="passwordMode"]')
  },
  loginFields: {
    email: document.getElementById('login-email'),
    password: document.getElementById('login-password'),
    submit: document.getElementById('login-submit'),
    remember: document.getElementById('login-remember')
  }
};

const registerValidity = {
  lastName: false,
  firstName: false,
  middleName: true,
  phone: false,
  email: false,
  dob: false,
  password: false,
  passwordConfirm: false,
  nickname: false,
  nicknameManual: true,
  agreement: false
};

let toastTimer = null;
let nicknameInputTimer = null;

function showToast(message, type = 'info') {
  if (!elements.toast || !message) return;
  elements.toast.textContent = message;
  elements.toast.setAttribute('data-type', type);
  elements.toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    elements.toast.classList.remove('is-visible');
  }, 3200);
}

function setFieldError(input, message) {
  if (!input) return;
  const field = input.closest('.form-field') || input.closest('.agreement-block');
  if (!field) return;
  const errorEl = field.querySelector(`[data-error-for="${input.id}"]`);
  field.classList.toggle('invalid', Boolean(message));
  if (errorEl) errorEl.textContent = message || '';
}

function setValidity(fieldName, value) {
  registerValidity[fieldName] = value;
  updateRegisterButtonState();
}

function updateRegisterButtonState() {
  const submit = elements.registrationFields.submit;
  if (!submit) return;
  
  // Проверяем каждое поле с учетом условий
  const requiredFields = Object.entries(registerValidity)
    .filter(([key, value]) => {
      // Исключаем password и passwordConfirm если режим auto
      if (state.registration.passwordMode === 'auto' && (key === 'password' || key === 'passwordConfirm')) {
        return false;
      }
      // Исключаем nicknameManual если ручной ввод не включен
      if (!state.registration.manualNicknameEnabled && key === 'nicknameManual') {
        return false;
      }
      // Исключаем middleName (необязательное поле)
      if (key === 'middleName') {
        return false;
      }
      return true;
    });
  
  const allValid = requiredFields.every(([key, value]) => Boolean(value));
  
  // Отладка: выводим состояние полей в консоль (только при необходимости)
  // Закомментировано, чтобы не засорять консоль
  // if (!allValid) {
  //   const invalidFields = requiredFields.filter(([key, value]) => !value);
  //   console.log('Invalid fields:', invalidFields.map(([key]) => key));
  //   console.log('Register validity state:', registerValidity);
  // }
  
  submit.disabled = !allValid || state.isSubmitting;
}

function sanitizeName(value) {
  return value
    .replace(/[^A-Za-z\u0400-\u04FF\u0500-\u052F\u2DE0-\u2DFF\uA640-\uA69F'\-\s]/g, '')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

function validateNameField(input, fieldName) {
  if (!input) return false;
  const value = sanitizeName(input.value);
  input.value = value;
  if (!value) {
    setFieldError(input, 'This field is required.');
    setValidity(fieldName, false);
    return false;
  }
  if (value.length < 2) {
    setFieldError(input, 'Enter at least 2 characters.');
    setValidity(fieldName, false);
    return false;
  }
  setFieldError(input, '');
  setValidity(fieldName, true);
  return true;
}

function validateMiddleNameField() {
  const input = elements.registrationFields.middleName;
  if (!input) return true;
  const value = sanitizeName(input.value);
  input.value = value;
  if (!value) {
    setFieldError(input, '');
    setValidity('middleName', true);
    return true;
  }
  setFieldError(input, '');
  setValidity('middleName', true);
  return true;
}

function normalizeBelarusPhone(value) {
  if (!value) return null;
  const digits = value.replace(/\D/g, '');
  let normalized = digits;
  if (digits.startsWith('80') && digits.length === 11) {
    normalized = `375${digits.slice(2)}`;
  } else if (digits.startsWith('375') && digits.length === 12) {
    normalized = digits;
  } else if (digits.startsWith('375') && digits.length === 11) {
    normalized = `375${digits.slice(3)}`;
  }
  if (normalized.length !== 12 || !normalized.startsWith('375')) return null;
  const operator = normalized.slice(3, 5);
  if (!BELARUS_OPERATORS.has(operator)) return null;
  const formatted = `+375 ${operator} ${normalized.slice(5, 8)}-${normalized.slice(8, 10)}-${normalized.slice(10)}`;
  return { formatted, digits: `+${normalized}` };
}

function validatePhoneField() {
  const input = elements.registrationFields.phone;
  if (!input) return false;
  const normalized = normalizeBelarusPhone(input.value);
  if (!normalized) {
    setFieldError(input, 'Enter a valid Belarus phone number (+375 XX XXX-XX-XX).');
    setValidity('phone', false);
    return false;
  }
  input.value = normalized.formatted;
  setFieldError(input, '');
  setValidity('phone', true);
  return true;
}

function validateEmailSyntax(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

async function checkEmailUnique(email) {
  const cache = state.registration.emailCheckCache ?? new Map();
  state.registration.emailCheckCache = cache;
  const key = email.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const response = await fetch(`${ENDPOINTS.users}?emailLower=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`Email check failed: ${response.status}`);
  const data = await response.json();
  const unique = !Array.isArray(data) || data.length === 0;
  cache.set(key, unique);
  return unique;
}

async function validateEmailField() {
  const input = elements.registrationFields.email;
  if (!input) return false;
  const value = input.value.trim();
  if (!value) {
    setFieldError(input, 'Email is required.');
    setValidity('email', false);
    return false;
  }
  if (!validateEmailSyntax(value)) {
    setFieldError(input, 'Enter a valid email address.');
    setValidity('email', false);
    return false;
  }
  try {
    const unique = await checkEmailUnique(value);
    if (!unique) {
      setFieldError(input, 'This email is already registered.');
      setValidity('email', false);
      return false;
    }
    setFieldError(input, '');
    setValidity('email', true);
    return true;
  } catch (error) {
    console.error(error);
    setFieldError(input, 'Unable to verify email. Try again later.');
    setValidity('email', false);
    return false;
  }
}

function validateDobField() {
  const input = elements.registrationFields.dob;
  if (!input) return false;
  if (!input.value) {
    setFieldError(input, 'Select your birth date.');
    setValidity('dob', false);
    return false;
  }
  const dob = new Date(input.value);
  if (Number.isNaN(dob.getTime())) {
    setFieldError(input, 'Enter a valid date.');
    setValidity('dob', false);
    return false;
  }
  const today = new Date();
  const minDate = new Date(today.getFullYear() - 16, today.getMonth(), today.getDate());
  if (dob > minDate) {
    setFieldError(input, 'Registration is available from 16 years old.');
    setValidity('dob', false);
    return false;
  }
  setFieldError(input, '');
  setValidity('dob', true);
  return true;
}

function containsRequiredCharacters(password) {
  return /[A-Z]/.test(password) &&
    /[a-z]/.test(password) &&
    /\d/.test(password) &&
    /[!@#$%^&*()\-_=+[{\]}|;:'",<.>/?`~]/.test(password);
}

function isPasswordCommon(password) {
  return TOP_PASSWORDS_2024.has(password.toLowerCase());
}

function validateManualPassword() {
  const password = elements.registrationFields.password;
  const confirm = elements.registrationFields.passwordConfirm;
  if (!password || !confirm) return false;
  const value = password.value;
  if (!value) {
    setFieldError(password, 'Enter a password.');
    setValidity('password', false);
    return false;
  }
  if (value.length < PASSWORD_LIMITS.min || value.length > PASSWORD_LIMITS.max) {
    setFieldError(password, `Password must be ${PASSWORD_LIMITS.min}-${PASSWORD_LIMITS.max} characters.`);
    setValidity('password', false);
    return false;
  }
  if (!containsRequiredCharacters(value)) {
    setFieldError(password, 'Add upper, lower, digit and special characters.');
    setValidity('password', false);
    return false;
  }
  if (isPasswordCommon(value)) {
    setFieldError(password, 'Password is too common. Choose another one.');
    setValidity('password', false);
    return false;
  }
  setFieldError(password, '');
  setValidity('password', true);
  if (!confirm.value) {
    setFieldError(confirm, 'Repeat the password.');
    setValidity('passwordConfirm', false);
    return false;
  }
  if (confirm.value !== value) {
    setFieldError(confirm, 'Passwords do not match.');
    setValidity('passwordConfirm', false);
    return false;
  }
  setFieldError(confirm, '');
  setValidity('passwordConfirm', true);
  return true;
}

function generateStrongPassword() {
  const upper = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  const lower = 'abcdefghijkmnpqrstuvwxyz';
  const digits = '23456789';
  const special = '!@#$%^&*()-_=+[]{}<>?';
  const all = upper + lower + digits + special;
  const pick = (chars) => chars[Math.floor(Math.random() * chars.length)];
  let result = [
    pick(upper),
    pick(lower),
    pick(digits),
    pick(special)
  ];
  const targetLength = PASSWORD_LIMITS.min + Math.floor(Math.random() * (PASSWORD_LIMITS.max - PASSWORD_LIMITS.min + 1));
  while (result.length < targetLength) result.push(pick(all));
  result = result.sort(() => Math.random() - 0.5).join('');
  if (!containsRequiredCharacters(result) || isPasswordCommon(result)) {
    return generateStrongPassword();
  }
  return result;
}

function applyAutoPassword() {
  const field = elements.registrationFields.passwordAuto;
  if (!field) {
    console.warn('Password auto field not found');
    return;
  }
  const password = generateStrongPassword();
  state.registration.generatedPassword = password;
  field.value = password;
  setValidity('password', true);
  setValidity('passwordConfirm', true);
  updateRegisterButtonState();
  showToast('New password generated', 'success');
}

function switchPasswordMode(mode) {
  state.registration.passwordMode = mode;
  const manualSection = document.querySelector('[data-password-section="manual"]');
  const autoSection = document.querySelector('[data-password-section="auto"]');
  
  if (manualSection) {
    manualSection.hidden = mode !== 'manual';
    manualSection.style.display = mode === 'manual' ? '' : 'none';
  }
  if (autoSection) {
    autoSection.hidden = mode !== 'auto';
    autoSection.style.display = mode === 'auto' ? '' : 'none';
  }
  
  if (mode === 'manual') {
    setValidity('password', false);
    setValidity('passwordConfirm', false);
    if (elements.registrationFields.password) elements.registrationFields.password.value = '';
    if (elements.registrationFields.passwordConfirm) elements.registrationFields.passwordConfirm.value = '';
  } else {
    applyAutoPassword();
  }
  updateRegisterButtonState();
}

function transliterate(value) {
  const map = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i',
    й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's', т: 't',
    у: 'u', ф: 'f', х: 'h', ц: 'ts', ч: 'ch', ш: 'sh', щ: 'shch', ъ: '', ы: 'y',
    ь: '', э: 'e', ю: 'yu', я: 'ya'
  };
  return value
    .split('')
    .map((char) => {
      const lower = char.toLowerCase();
      const replacement = map[lower];
      if (replacement === undefined) return char;
      return /[A-ZА-Я]/.test(char) ? replacement.toUpperCase() : replacement;
    })
    .join('');
}

function formatNicknameCandidate(firstName, lastName) {
  const safeFirst = transliterate(firstName || '').replace(/[^A-Za-z]/g, '');
  const safeLast = transliterate(lastName || '').replace(/[^A-Za-z]/g, '');
  const prefix = safeFirst.slice(0, 3);
  const suffix = safeLast.slice(0, 3);
  const number = Math.floor(Math.random() * 990) + 10;
  const suffixes = ['lex', 'law', 'prime', 'studio', 'team', 'plus'];
  const extra = Math.random() < 0.4 ? suffixes[Math.floor(Math.random() * suffixes.length)] : '';
  const candidate = `${prefix}${suffix}${number}${extra}`;
  return candidate || `user${number}`;
}

async function checkNicknameUnique(nickname) {
  const cache = state.registration.nicknameCheckCache ?? new Map();
  state.registration.nicknameCheckCache = cache;
  const key = nickname.toLowerCase();
  if (cache.has(key)) return cache.get(key);
  const response = await fetch(`${ENDPOINTS.users}?nicknameLower=${encodeURIComponent(key)}`);
  if (!response.ok) throw new Error(`Nickname check failed: ${response.status}`);
  const data = await response.json();
  const unique = !Array.isArray(data) || data.length === 0;
  cache.set(key, unique);
  return unique;
}

async function generateUniqueNickname(firstName, lastName, limit = 12) {
  let attempt = 0;
  while (attempt < limit) {
    const candidate = formatNicknameCandidate(firstName, lastName).slice(0, 24);
    if (candidate.length >= 3) {
      const unique = await checkNicknameUnique(candidate);
      if (unique) return candidate;
    }
    attempt += 1;
  }
  throw new Error('Unable to generate a unique nickname. Please enter one manually.');
}

async function updateAutoNickname() {
  if (state.registration.manualNicknameEnabled) return;
  const firstName = sanitizeName(elements.registrationFields.firstName?.value || '');
  const lastName = sanitizeName(elements.registrationFields.lastName?.value || '');
  if (firstName.length < 2 || lastName.length < 2) return;
  try {
    state.registration.pendingNicknameGeneration = generateUniqueNickname(firstName, lastName);
    const nickname = await state.registration.pendingNicknameGeneration;
    if (state.registration.manualNicknameEnabled) return;
    elements.registrationFields.nickname.value = nickname;
    state.registration.generatedNickname = nickname;
    setFieldError(elements.registrationFields.nickname, '');
    setValidity('nickname', true);
  } catch (error) {
    console.error(error);
    setFieldError(elements.registrationFields.nickname, error.message);
    setValidity('nickname', false);
  } finally {
    state.registration.pendingNicknameGeneration = null;
    updateRegisterButtonState();
  }
}

async function handleNicknameRefresh() {
  if (!elements.registrationFields.nickname) return;
  state.registration.nicknameAttempts += 1;
  try {
    const firstName = sanitizeName(elements.registrationFields.firstName?.value || '');
    const lastName = sanitizeName(elements.registrationFields.lastName?.value || '');
    const nickname = await generateUniqueNickname(firstName, lastName);
    elements.registrationFields.nickname.value = nickname;
    state.registration.generatedNickname = nickname;
    setFieldError(elements.registrationFields.nickname, '');
    setValidity('nickname', true);
    showToast(`Suggested nickname: ${nickname}`, 'success');
  } catch (error) {
    setFieldError(elements.registrationFields.nickname, error.message);
    setValidity('nickname', false);
  } finally {
    if (!state.registration.manualNicknameEnabled && state.registration.nicknameAttempts >= MAX_NICKNAME_REGENERATIONS) {
      enableManualNicknameEntry();
    }
    updateRegisterButtonState();
  }
}

function enableManualNicknameEntry() {
  state.registration.manualNicknameEnabled = true;
  const wrapper = elements.registrationFields.nicknameManualWrapper;
  if (wrapper) wrapper.hidden = false;
  elements.registrationFields.nicknameManual?.focus();
  showToast('Manual nickname entry unlocked.', 'info');
}

function validateManualNickname() {
  const input = elements.registrationFields.nicknameManual;
  if (!input) {
    setValidity('nicknameManual', true);
    return true;
  }
  const value = input.value.trim();
  if (!value) {
    setFieldError(input, 'Enter a nickname.');
    setValidity('nicknameManual', false);
    return false;
  }
  if (!/^[A-Za-z][A-Za-z0-9_]{2,23}$/.test(value)) {
    setFieldError(input, 'Use 3-24 chars: letters, numbers and underscore. Start with a letter.');
    setValidity('nicknameManual', false);
    return false;
  }
  setFieldError(input, '');
  setValidity('nicknameManual', true);
  return true;
}

async function validateManualNicknameUnique() {
  const input = elements.registrationFields.nicknameManual;
  if (!input) return false;
  const value = input.value.trim();
  if (!value) return false;
  try {
    const unique = await checkNicknameUnique(value);
    if (!unique) {
      setFieldError(input, 'Nickname already taken.');
      setValidity('nicknameManual', false);
      return false;
    }
    setFieldError(input, '');
    setValidity('nicknameManual', true);
    return true;
  } catch (error) {
    console.error(error);
    setFieldError(input, 'Unable to verify nickname.');
    setValidity('nicknameManual', false);
    return false;
  }
}

function onAgreementScroll() {
  const content = elements.agreementContent;
  const markButton = elements.agreementMarkRead;
  if (!content || !markButton) return;
  if (content.scrollTop + content.clientHeight + 8 >= content.scrollHeight) {
    markButton.disabled = false;
  }
}

function openAgreementModal() {
  if (!elements.agreementModal) return;
  if (typeof elements.agreementModal.showModal === 'function') {
    elements.agreementModal.showModal();
  } else {
    elements.agreementModal.setAttribute('open', '');
  }
  if (elements.agreementContent) {
    elements.agreementContent.scrollTop = 0;
    elements.agreementContent.addEventListener('scroll', onAgreementScroll, { passive: true });
  }
  if (elements.agreementMarkRead) elements.agreementMarkRead.disabled = true;
}

function closeAgreementModal() {
  if (!elements.agreementModal) return;
  if (elements.agreementContent) {
    elements.agreementContent.removeEventListener('scroll', onAgreementScroll);
  }
  if (elements.agreementModal.open) {
    elements.agreementModal.close();
  } else {
    elements.agreementModal.removeAttribute('open');
  }
}

function markAgreementRead() {
  const checkbox = elements.registrationFields.agreement;
  if (!checkbox) return;
  checkbox.disabled = false;
  checkbox.checked = true;
  state.registration.agreementRead = true;
  setFieldError(checkbox, '');
  setValidity('agreement', true);
  closeAgreementModal();
  showToast('Agreement accepted. Thank you!', 'success');
}

function handleAgreementChange() {
  const checkbox = elements.registrationFields.agreement;
  if (!checkbox) return;
  if (checkbox.checked) {
    setFieldError(checkbox, '');
    setValidity('agreement', true);
  } else {
    setFieldError(checkbox, 'You must accept the user agreement.');
    setValidity('agreement', false);
  }
}

function resetRegistrationForm() {
  elements.registerForm?.reset();
  Object.keys(registerValidity).forEach((key) => {
    registerValidity[key] = key === 'middleName' || key === 'nicknameManual';
  });
  state.registration.nicknameAttempts = 0;
  state.registration.manualNicknameEnabled = false;
  state.registration.generatedNickname = '';
  state.registration.generatedPassword = '';
  state.registration.agreementRead = false;
  state.registration.emailCheckCache = null;
  state.registration.nicknameCheckCache = null;
  const wrapper = elements.registrationFields.nicknameManualWrapper;
  if (wrapper) wrapper.hidden = true;
  const manualNickname = elements.registrationFields.nicknameManual;
  if (manualNickname) manualNickname.value = '';
  const nickname = elements.registrationFields.nickname;
  if (nickname) nickname.value = '';
  const agreement = elements.registrationFields.agreement;
  if (agreement) {
    agreement.checked = false;
    agreement.disabled = true;
  }
  updateRegisterButtonState();
}

async function hashPassword(password) {
  if (window.crypto?.subtle) {
    const data = new TextEncoder().encode(password);
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, '0'))
      .join('');
  }
  return btoa(password);
}

async function handleRegistrationSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting) return;

  const validLastName = validateNameField(elements.registrationFields.lastName, 'lastName');
  const validFirstName = validateNameField(elements.registrationFields.firstName, 'firstName');
  const validMiddleName = validateMiddleNameField();
  const validPhone = validatePhoneField();
  const validDob = validateDobField();
  const validAgreement = Boolean(elements.registrationFields.agreement?.checked);
  setValidity('agreement', validAgreement);
  if (!validAgreement) {
    setFieldError(elements.registrationFields.agreement, 'You must accept the user agreement.');
  }
  const validEmail = await validateEmailField();
  let validPassword = true;
  if (state.registration.passwordMode === 'manual') {
    validPassword = validateManualPassword();
  }

  let validNickname = true;
  if (state.registration.manualNicknameEnabled) {
    validNickname = validateManualNickname();
    if (validNickname) validNickname = await validateManualNicknameUnique();
  } else {
    const nicknameInput = elements.registrationFields.nickname;
    if (!nicknameInput?.value) {
      validNickname = false;
      setFieldError(nicknameInput, 'Generate a nickname or use manual entry.');
      setValidity('nickname', false);
    } else {
      const unique = await checkNicknameUnique(nicknameInput.value);
      if (!unique) {
        validNickname = false;
        setFieldError(nicknameInput, 'Nickname already exists. Try again.');
        setValidity('nickname', false);
      } else {
        setFieldError(nicknameInput, '');
        setValidity('nickname', true);
      }
    }
  }

  const everyValid = [
    validLastName,
    validFirstName,
    validMiddleName,
    validPhone,
    validDob,
    validAgreement,
    validEmail,
    validPassword,
    validNickname
  ].every(Boolean);

  if (!everyValid) {
    showToast('Please fix validation messages and try again.', 'info');
    updateRegisterButtonState();
    return;
  }

  state.isSubmitting = true;
  updateRegisterButtonState();
  const submit = elements.registrationFields.submit;
  const initialText = submit?.textContent;
  if (submit) submit.textContent = 'Creating profile...';

  try {
    const normalizedPhone = normalizeBelarusPhone(elements.registrationFields.phone.value);
    const password = state.registration.passwordMode === 'auto'
      ? elements.registrationFields.passwordAuto.value
      : elements.registrationFields.password.value;
    const passwordHash = await hashPassword(password);
    const nicknameValue = state.registration.manualNicknameEnabled
      ? elements.registrationFields.nicknameManual.value.trim()
      : elements.registrationFields.nickname.value.trim();
    const nowIso = new Date().toISOString();

    const payload = {
      firstName: sanitizeName(elements.registrationFields.firstName.value),
      lastName: sanitizeName(elements.registrationFields.lastName.value),
      middleName: sanitizeName(elements.registrationFields.middleName.value),
      fullName: [elements.registrationFields.lastName.value, elements.registrationFields.firstName.value, elements.registrationFields.middleName.value]
        .map((value) => sanitizeName(value))
        .filter(Boolean)
        .join(' '),
      phone: normalizedPhone ? normalizedPhone.digits : elements.registrationFields.phone.value,
      phoneFormatted: normalizedPhone ? normalizedPhone.formatted : elements.registrationFields.phone.value,
      email: elements.registrationFields.email.value.trim(),
      emailLower: elements.registrationFields.email.value.trim().toLowerCase(),
      dateOfBirth: elements.registrationFields.dob.value,
      passwordHash,
      passwordStrategy: state.registration.passwordMode,
      nickname: nicknameValue,
      nicknameLower: nicknameValue.toLowerCase(),
      role: 'customer',
      status: 'active',
      registeredAt: nowIso,
      lastLoginAt: null,
      agreementAcceptedAt: nowIso,
      agreementVersion: '2024-10'
    };

    const response = await fetch(ENDPOINTS.users, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`Registration failed: ${response.status}`);
    const createdUser = await response.json();
    const { passwordHash: _, ...sessionUser } = createdUser;
    setCurrentUser(sessionUser);
    showToast('Registration completed successfully!', 'success');
    
    // Немедленная переадресация на главную страницу
    console.log('Registration successful, redirecting...');
    const redirectUrl = './index.html';
    
    // Выполняем переадресацию немедленно, но после текущего выполнения кода
    Promise.resolve().then(() => {
      console.log('Executing redirect to index.html');
      window.location.replace(redirectUrl);
    });
  } catch (error) {
    console.error(error);
    showToast('Could not complete registration. Please try later.', 'error');
  } finally {
    // Не сбрасываем состояние если происходит переадресация
    if (!window.location.href.includes('index.html')) {
      state.isSubmitting = false;
      if (submit) submit.textContent = initialText || 'Sign Up';
      updateRegisterButtonState();
    }
  }
}

async function fetchUserByEmail(email) {
  const response = await fetch(`${ENDPOINTS.users}?emailLower=${encodeURIComponent(email.toLowerCase())}`);
  if (!response.ok) throw new Error(`Lookup failed: ${response.status}`);
  const data = await response.json();
  if (!Array.isArray(data) || !data.length) return null;
  return data[0];
}

async function handleLoginSubmit(event) {
  event.preventDefault();
  if (state.isSubmitting) return;
  const emailInput = elements.loginFields.email;
  const passwordInput = elements.loginFields.password;
  if (!emailInput || !passwordInput) return;
  const emailValue = emailInput.value.trim();
  const passwordValue = passwordInput.value;
  if (!emailValue || !validateEmailSyntax(emailValue)) {
    setFieldError(emailInput, 'Enter a valid email.');
    return;
  }
  if (!passwordValue) {
    setFieldError(passwordInput, 'Enter your password.');
    return;
  }

  state.isSubmitting = true;
  const submit = elements.loginFields.submit;
  const initialText = submit?.textContent;
  if (submit) submit.textContent = 'Signing in...';

  try {
    const user = await fetchUserByEmail(emailValue);
    if (!user || !user.passwordHash) {
      throw new Error('Invalid credentials');
    }
    const passwordHash = await hashPassword(passwordValue);
    if (passwordHash !== user.passwordHash) {
      throw new Error('Invalid credentials');
    }
    setFieldError(emailInput, '');
    setFieldError(passwordInput, '');
    const nowIso = new Date().toISOString();
    await fetch(`${ENDPOINTS.users}/${encodeURIComponent(user.id)}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ lastLoginAt: nowIso })
    });
    const { passwordHash: _, ...sessionUser } = user;
    setCurrentUser({ ...sessionUser, lastLoginAt: nowIso });
    showToast('Signed in successfully.', 'success');
    
    // Немедленная переадресация на главную страницу
    console.log('Login successful, redirecting...');
    const redirectUrl = './index.html';
    
    // Выполняем переадресацию немедленно, но после текущего выполнения кода
    Promise.resolve().then(() => {
      console.log('Executing redirect to index.html');
      window.location.replace(redirectUrl);
    });
  } catch (error) {
    console.error(error);
    setFieldError(passwordInput, 'Invalid email or password.');
    showToast('Unable to sign in. Check your credentials.', 'error');
  } finally {
    // Не сбрасываем состояние если происходит переадресация
    if (!window.location.href.includes('index.html')) {
      state.isSubmitting = false;
      if (submit) submit.textContent = initialText || 'Sign In';
      updateRegisterButtonState();
    }
  }
}

function switchAuthMode(mode) {
  elements.tabs.forEach((tab) => {
    const active = tab.dataset.mode === mode;
    tab.classList.toggle('is-active', active);
    tab.setAttribute('aria-selected', active ? 'true' : 'false');
  });
  elements.panels.forEach((panel) => {
    const active = panel.dataset.panel === mode;
    panel.setAttribute('aria-hidden', active ? 'false' : 'true');
  });
}

function handleTabClick(event) {
  const button = event.target.closest('.auth-tab');
  if (!button) return;
  switchAuthMode(button.dataset.mode);
}

function handleSwitchToRegister(event) {
  event.preventDefault();
  switchAuthMode('register');
  elements.registrationFields.lastName?.focus();
}

function registerEventListeners() {
  elements.tabs.forEach((tab) => tab.addEventListener('click', handleTabClick));
  elements.switchToRegisterLinks.forEach((link) => link.addEventListener('click', handleSwitchToRegister));

  const fields = elements.registrationFields;
  fields.lastName?.addEventListener('input', () => {
    validateNameField(fields.lastName, 'lastName');
    scheduleNicknameUpdate();
  });
  fields.firstName?.addEventListener('input', () => {
    validateNameField(fields.firstName, 'firstName');
    scheduleNicknameUpdate();
  });
  fields.middleName?.addEventListener('input', validateMiddleNameField);
  fields.phone?.addEventListener('input', () => {
    setFieldError(fields.phone, '');
    setValidity('phone', false);
  });
  fields.phone?.addEventListener('blur', validatePhoneField);
  fields.email?.addEventListener('input', () => {
    setFieldError(fields.email, '');
    setValidity('email', false);
  });
  fields.email?.addEventListener('blur', validateEmailField);
  fields.dob?.addEventListener('change', () => {
    validateDobField();
    updateRegisterButtonState();
  });
  // Также проверяем при изменении даты
  fields.dob?.addEventListener('input', () => {
    if (fields.dob.value) {
      validateDobField();
    }
  });
  fields.password?.addEventListener('input', validateManualPassword);
  fields.passwordConfirm?.addEventListener('input', validateManualPassword);
  fields.passwordConfirm?.addEventListener('paste', (event) => event.preventDefault());
  fields.passwordConfirm?.addEventListener('drop', (event) => event.preventDefault());

  fields.passwordMode?.forEach((radio) => {
    radio.addEventListener('change', (event) => {
      if (event.target.checked) {
        switchPasswordMode(event.target.value);
      }
    });
  });

  fields.nicknameManual?.addEventListener('input', validateManualNickname);
  fields.nicknameManual?.addEventListener('blur', () => {
    if (validateManualNickname()) validateManualNicknameUnique();
  });

  fields.agreement?.addEventListener('change', handleAgreementChange);

  // Добавляем проверку всех полей при изменении любого из них
  const checkAllFields = async () => {
    // Проверяем все обязательные поля
    if (elements.registrationFields.lastName?.value) {
      validateNameField(elements.registrationFields.lastName, 'lastName');
    }
    if (elements.registrationFields.firstName?.value) {
      validateNameField(elements.registrationFields.firstName, 'firstName');
    }
    if (elements.registrationFields.phone?.value) {
      validatePhoneField();
    }
    if (elements.registrationFields.email?.value) {
      await validateEmailField();
    }
    if (elements.registrationFields.dob?.value) {
      validateDobField();
    }
    if (state.registration.passwordMode === 'manual') {
      validateManualPassword();
    }
    // Проверяем никнейм, если он заполнен
    const nicknameValue = elements.registrationFields.nickname?.value;
    if (nicknameValue && !state.registration.manualNicknameEnabled) {
      try {
        const unique = await checkNicknameUnique(nicknameValue);
        setValidity('nickname', unique);
        if (!unique) {
          setFieldError(elements.registrationFields.nickname, 'Nickname already exists.');
        }
      } catch (error) {
        // Если проверка не удалась, но никнейм заполнен, считаем валидным
        setValidity('nickname', true);
      }
    }
    updateRegisterButtonState();
  };

  // Добавляем проверку всех полей при потере фокуса
  const formElement = elements.registerForm;
  if (formElement) {
    formElement.addEventListener('focusout', (event) => {
      if (event.target.closest('#registration-form')) {
        setTimeout(checkAllFields, 150);
      }
    }, true);
    
    // Проверка при попытке нажать на кнопку регистрации
    elements.registrationFields.submit?.addEventListener('mousedown', async (event) => {
      if (elements.registrationFields.submit?.disabled) {
        event.preventDefault();
        await checkAllFields();
        const invalidFields = Object.entries(registerValidity)
          .filter(([key, value]) => {
            if (state.registration.passwordMode === 'auto' && (key === 'password' || key === 'passwordConfirm')) return false;
            if (!state.registration.manualNicknameEnabled && key === 'nicknameManual') return false;
            if (key === 'middleName') return false;
            return !value;
          });
        if (invalidFields.length > 0) {
          showToast(`Please fill: ${invalidFields.map(([key]) => key).join(', ')}`, 'info');
        }
      }
    });
  }

  elements.nicknameRefresh?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    handleNicknameRefresh();
  });
  elements.passwordRegenerate?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopPropagation();
    applyAutoPassword();
  });

  elements.openAgreementButtons.forEach((button) => button.addEventListener('click', openAgreementModal));
  elements.agreementCloseButtons.forEach((button) => button.addEventListener('click', closeAgreementModal));
  elements.agreementMarkRead?.addEventListener('click', markAgreementRead);
  elements.agreementModal?.addEventListener('cancel', (event) => {
    event.preventDefault();
    closeAgreementModal();
  });

  elements.registerForm?.addEventListener('submit', handleRegistrationSubmit);
  elements.loginForm?.addEventListener('submit', handleLoginSubmit);
}

function scheduleNicknameUpdate() {
  clearTimeout(nicknameInputTimer);
  nicknameInputTimer = setTimeout(updateAutoNickname, 400);
}

function initPageState() {
  // Проверяем, что все необходимые элементы найдены
  if (!elements.registrationFields.nickname) {
    console.warn('Nickname field not found');
  }
  if (!elements.passwordRegenerate) {
    console.warn('Password regenerate button not found');
  }
  if (!elements.nicknameRefresh) {
    console.warn('Nickname refresh button not found');
  }
  
  switchPasswordMode(state.registration.passwordMode);
  
  // Проверяем, нужно ли сгенерировать никнейм
  const firstName = elements.registrationFields.firstName?.value?.trim();
  const lastName = elements.registrationFields.lastName?.value?.trim();
  if (firstName && lastName && firstName.length >= 2 && lastName.length >= 2) {
    if (!elements.registrationFields.nickname?.value) {
      updateAutoNickname();
    } else {
      // Если никнейм уже есть, проверяем его валидность
      checkNicknameUnique(elements.registrationFields.nickname.value)
        .then((unique) => setValidity('nickname', unique))
        .catch(() => setValidity('nickname', true));
    }
  }
  
  updateRegisterButtonState();
  const currentUser = getCurrentUser();
  if (currentUser) {
    showToast('You are already signed in.', 'info');
  }
}

function initAuthPage() {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      registerEventListeners();
      initPageState();
    });
  } else {
    registerEventListeners();
    initPageState();
  }
}

initAuthPage();
