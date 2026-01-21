class Marketplace {
    constructor() {
        this.accounts = [];
        this.init();
    }

    async init() {
        await this.loadAccounts();
        this.renderAccounts();
    }

    async loadAccounts() {
        const loadingElement = document.getElementById('loading');
        const container = document.getElementById('accountsContainer');
        const noAccounts = document.getElementById('noAccounts');
        
        try {
            const response = await fetch('/api/accounts');
            this.accounts = await response.json();
            
            loadingElement.classList.add('hidden');
            
            if (this.accounts.length === 0) {
                noAccounts.classList.remove('hidden');
            } else {
                container.classList.remove('hidden');
            }
            
        } catch (error) {
            console.error('Failed to load accounts:', error);
            loadingElement.innerHTML = `
                <div class="alert alert-danger">
                    <h3>Error Loading Accounts</h3>
                    <p>${error.message}</p>
                </div>
            `;
        }
    }

    renderAccounts() {
        const container = document.getElementById('accountsContainer');
        if (!container) return;
        
        container.innerHTML = '';
        
        this.accounts.forEach(account => {
            const card = this.createAccountCard(account);
            container.appendChild(card);
        });
        
        // Initialize image sliders
        this.initImageSliders();
    }

    createAccountCard(account) {
        const card = document.createElement('div');
        card.className = 'account-card';
        
        // Get first 5 images for slider
        const sliderImages = account.images.slice(0, 5);
        const hasImages = sliderImages.length > 0;
        
        // Create image slider HTML
        const sliderHTML = hasImages ? `
            <div class="image-slider" data-account-id="${account.id}">
                ${sliderImages.map((img, index) => `
                    <img src="/uploads/${img}" 
                         class="slider-image ${index === 0 ? 'active' : ''}" 
                         alt="Account ${account.id} - Image ${index + 1}">
                `).join('')}
                <div class="slider-dots">
                    ${sliderImages.map((_, index) => `
                        <div class="slider-dot ${index === 0 ? 'active' : ''}" 
                             data-slide="${index}"></div>
                    `).join('')}
                </div>
            </div>
        ` : `
            <div class="image-slider">
                <div style="display: flex; align-items: center; justify-content: center; height: 100%;">
                    <span>No Images</span>
                </div>
            </div>
        `;
        
        card.innerHTML = `
            ${sliderHTML}
            <div class="account-details">
                <div class="account-id">Account #${account.id}</div>
                <div class="account-email">${account.email}</div>
                <div class="account-meta">
                    <span>${account.images.length} images</span>
                    <span>${new Date(account.created_at).toLocaleDateString()}</span>
                </div>
            </div>
        `;
        
        return card;
    }

    initImageSliders() {
        const sliders = document.querySelectorAll('.image-slider');
        
        sliders.forEach((slider, sliderIndex) => {
            const images = slider.querySelectorAll('.slider-image');
            const dots = slider.querySelectorAll('.slider-dot');
            
            if (images.length <= 1) return;
            
            let currentSlide = 0;
            
            // Setup dot click events
            dots.forEach((dot, index) => {
                dot.addEventListener('click', () => {
                    this.showSlide(slider, index);
                    currentSlide = index;
                });
            });
            
            // Auto-slide every 2 seconds
            setInterval(() => {
                currentSlide = (currentSlide + 1) % images.length;
                this.showSlide(slider, currentSlide);
            }, 2000);
        });
    }

    showSlide(slider, slideIndex) {
        const images = slider.querySelectorAll('.slider-image');
        const dots = slider.querySelectorAll('.slider-dot');
        
        // Hide all images
        images.forEach(img => img.classList.remove('active'));
        dots.forEach(dot => dot.classList.remove('active'));
        
        // Show selected image
        if (images[slideIndex]) {
            images[slideIndex].classList.add('active');
        }
        
        if (dots[slideIndex]) {
            dots[slideIndex].classList.add('active');
        }
    }
}

// Initialize marketplace when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new Marketplace();
});