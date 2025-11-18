const UNSPLASH_ACCESS_KEY = 'lvtII6A4uFr_d5ANAMUE94gBw7BQ73uYsMGiO4m04yA';
const UNSPLASH_API_URL = 'https://api.unsplash.com';

// DOM Elements
const searchInput = document.getElementById('searchInput');
const clearBtn = document.getElementById('clearBtn');
const filterSelect = document.getElementById('filterSelect');
const gallery = document.getElementById('gallery');
const loading = document.getElementById('loading');
const errorMessage = document.getElementById('errorMessage');

// State
let currentQuery = '';
let currentFilter = '';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Set current year in footer
    const yearElement = document.getElementById('currentYear');
    if (yearElement) {
        yearElement.textContent = new Date().getFullYear();
    }
    
    // Auto-focus on search input
    searchInput.focus();
    
    // Load initial photos
    loadPhotos();
    
    // Event listeners
    searchInput.addEventListener('input', handleInputChange);
    searchInput.addEventListener('keypress', handleKeyPress);
    clearBtn.addEventListener('click', handleClear);
    filterSelect.addEventListener('change', handleFilterChange);
});

// Handle input change
function handleInputChange() {
    if (searchInput.value.trim() === '') {
        clearBtn.style.display = 'none';
    } else {
        clearBtn.style.display = 'flex';
    }
}

// Handle Enter key press
function handleKeyPress(event) {
    if (event.key === 'Enter') {
        event.preventDefault();
        performSearch();
    }
}

// Handle clear button click
function handleClear() {
    searchInput.value = '';
    searchInput.focus();
    clearBtn.style.display = 'none';
    currentQuery = '';
    loadPhotos();
}

// Handle filter change
function handleFilterChange() {
    currentFilter = filterSelect.value;
    if (currentQuery) {
        performSearch();
    } else {
        loadPhotos();
    }
}

// Perform search
function performSearch() {
    const query = searchInput.value.trim();
    if (query === '') {
        currentQuery = '';
        loadPhotos();
        return;
    }
    
    currentQuery = query;
    searchPhotos(query);
}

// Load initial photos
async function loadPhotos() {
    showLoading();
    hideError();
    
    try {
        const url = buildApiUrl('/photos/random', {
            count: 12,
            orientation: currentFilter || undefined
        });
        
        const photos = await fetchPhotos(url);
        displayPhotos(photos);
    } catch (error) {
        console.error('Error loading photos:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// Search photos
async function searchPhotos(query) {
    showLoading();
    hideError();
    
    try {
        const url = buildApiUrl('/search/photos', {
            query: query,
            per_page: 20,
            orientation: currentFilter || undefined
        });
        
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        
        if (data.results && data.results.length > 0) {
            displayPhotos(data.results);
        } else {
            showError();
        }
    } catch (error) {
        console.error('Error searching photos:', error);
        showError();
    } finally {
        hideLoading();
    }
}

// Fetch photos from API
async function fetchPhotos(url) {
    const response = await fetch(url);
    
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return await response.json();
}

// Build API URL
function buildApiUrl(endpoint, params = {}) {
    const url = new URL(`${UNSPLASH_API_URL}${endpoint}`);
    
    // Add access key
    url.searchParams.append('client_id', UNSPLASH_ACCESS_KEY);
    
    // Add other parameters
    Object.keys(params).forEach(key => {
        if (params[key] !== undefined && params[key] !== '') {
            url.searchParams.append(key, params[key]);
        }
    });
    
    return url.toString();
}

// Display photos in gallery
function displayPhotos(photos) {
    gallery.innerHTML = '';
    
    if (!photos || photos.length === 0) {
        showError();
        return;
    }
    
    photos.forEach(photo => {
        const photoElement = createPhotoElement(photo);
        gallery.appendChild(photoElement);
    });
}

// Create photo element
function createPhotoElement(photo) {
    const item = document.createElement('article');
    item.className = 'gallery-item';
    
    // Image wrapper
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'gallery-item__image-wrapper';
    
    const img = document.createElement('img');
    img.className = 'gallery-item__image';
    img.src = photo.urls.regular;
    img.alt = photo.alt_description || photo.description || 'Изображение';
    img.loading = 'lazy';
    
    // Handle image load error
    img.onerror = function() {
        this.src = 'https://via.placeholder.com/400x300?text=Image+Error';
    };
    
    imageWrapper.appendChild(img);
    
    // Info section
    const info = document.createElement('div');
    info.className = 'gallery-item__info';
    
    // Author
    const author = document.createElement('div');
    author.className = 'gallery-item__author';
    author.textContent = photo.user.name || 'Неизвестный автор';
    info.appendChild(author);
    
    // Date
    const date = document.createElement('div');
    date.className = 'gallery-item__date';
    const photoDate = new Date(photo.created_at);
    date.textContent = photoDate.toLocaleDateString('ru-RU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    info.appendChild(date);
    
    // Likes
    const likes = document.createElement('div');
    likes.className = 'gallery-item__likes';
    likes.textContent = `${photo.likes || 0} лайков`;
    info.appendChild(likes);
    
    // Description
    if (photo.description) {
        const description = document.createElement('div');
        description.className = 'gallery-item__description';
        description.textContent = photo.description;
        info.appendChild(description);
    }
    
    // Open full image on click
    item.addEventListener('click', () => {
        window.open(photo.links.html, '_blank', 'noopener,noreferrer');
    });
    
    item.appendChild(imageWrapper);
    item.appendChild(info);
    
    return item;
}

// Show loading
function showLoading() {
    loading.style.display = 'block';
    gallery.style.display = 'none';
}

// Hide loading
function hideLoading() {
    loading.style.display = 'none';
    gallery.style.display = 'grid';
}

// Show error
function showError() {
    errorMessage.style.display = 'block';
    gallery.style.display = 'none';
}

// Hide error
function hideError() {
    errorMessage.style.display = 'none';
    gallery.style.display = 'grid';
}

