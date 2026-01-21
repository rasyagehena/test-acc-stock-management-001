class AddAccount {
    constructor() {
        this.selectedImages = [];
        this.maxImages = 40;
        this.init();
    }

    init() {
        this.setupImageUpload();
        this.setupIdValidation();
        this.setupFormSubmit();
    }

    setupImageUpload() {
        const fileInput = document.getElementById('imageUpload');
        const preview = document.getElementById('imagePreview');
        const countDisplay = document.getElementById('imageCount');

        // Handle file selection
        fileInput.addEventListener('change', (e) => {
            this.handleImageSelection(e.target.files);
        });

        // Handle drag and drop
        const dropZone = document.querySelector('.file-upload');
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '#4a6fa5';
            dropZone.style.backgroundColor = 'rgba(74, 111, 165, 0.1)';
        });

        dropZone.addEventListener('dragleave', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            dropZone.style.backgroundColor = '';
        });

        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            dropZone.style.backgroundColor = '';
            
            if (e.dataTransfer.files.length) {
                this.handleImageSelection(e.dataTransfer.files);
            }
        });

        this.updateImageCount();
    }

    handleImageSelection(files) {
        const remainingSlots = this.maxImages - this.selectedImages.length;
        
        // Convert FileList to array and take only remaining slots
        const newFiles = Array.from(files).slice(0, remainingSlots);
        
        // Validate each file
        newFiles.forEach(file => {
            if (!file.type.startsWith('image/')) {
                alert(`File "${file.name}" is not an image`);
                return;
            }
            
            if (file.size > 5 * 1024 * 1024) {
                alert(`File "${file.name}" exceeds 5MB limit`);
                return;
            }
            
            this.selectedImages.push(file);
        });
        
        this.updateImagePreview();
        this.updateImageCount();
    }

    updateImagePreview() {
        const preview = document.getElementById('imagePreview');
        preview.innerHTML = '';
        
        this.selectedImages.forEach((file, index) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                const previewItem = document.createElement('div');
                previewItem.className = 'file-preview-item';
                
                const img = document.createElement('img');
                img.src = e.target.result;
                img.alt = `Preview ${index + 1}`;
                
                const removeBtn = document.createElement('button');
                removeBtn.innerHTML = '×';
                removeBtn.style.position = 'absolute';
                removeBtn.style.top = '5px';
                removeBtn.style.right = '5px';
                removeBtn.style.background = 'red';
                removeBtn.style.color = 'white';
                removeBtn.style.border = 'none';
                removeBtn.style.borderRadius = '50%';
                removeBtn.style.width = '20px';
                removeBtn.style.height = '20px';
                removeBtn.style.cursor = 'pointer';
                removeBtn.onclick = () => {
                    this.selectedImages.splice(index, 1);
                    this.updateImagePreview();
                    this.updateImageCount();
                };
                
                previewItem.appendChild(img);
                previewItem.appendChild(removeBtn);
                preview.appendChild(previewItem);
            };
            
            reader.readAsDataURL(file);
        });
    }

    updateImageCount() {
        const countDisplay = document.getElementById('imageCount');
        if (countDisplay) {
            countDisplay.textContent = 
                `${this.selectedImages.length} of ${this.maxImages} images selected`;
        }
    }

    setupIdValidation() {
        const idInput = document.getElementById('accountId');
        const statusDisplay = document.getElementById('idStatus');
        
        idInput.addEventListener('blur', async () => {
            const id = idInput.value.trim();
            
            if (!id) {
                statusDisplay.textContent = '';
                return;
            }
            
            if (isNaN(id) || parseInt(id) < 1) {
                statusDisplay.textContent = 'ID must be a positive number';
                statusDisplay.className = 'error-message';
                return;
            }
            
            try {
                const response = await fetch(`/api/check-id/${id}`);
                const data = await response.json();
                
                if (data.available) {
                    statusDisplay.textContent = '✓ ID is available';
                    statusDisplay.className = 'success-message';
                } else {
                    statusDisplay.textContent = '✗ ID already exists';
                    statusDisplay.className = 'error-message';
                }
            } catch (error) {
                statusDisplay.textContent = 'Error checking ID';
                statusDisplay.className = 'error-message';
            }
        });
    }

    setupFormSubmit() {
        const form = document.getElementById('addAccountForm');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            // Validate form
            if (!this.validateForm()) return;
            
            // Check ID availability again
            const idInput = document.getElementById('accountId');
            const id = idInput.value.trim();
            
            try {
                const response = await fetch(`/api/check-id/${id}`);
                const data = await response.json();
                
                if (!data.available) {
                    this.showMessage('ID already exists. Please choose a different ID.');
                    return;
                }
                
                // Submit form
                await this.submitForm();
                
            } catch (error) {
                this.showMessage('Error checking ID availability');
            }
        });
    }

    validateForm() {
        const id = document.getElementById('accountId').value.trim();
        const email = document.getElementById('email').value.trim();
        const googlePassword = document.getElementById('googlePassword').value;
        const moontonPassword = document.getElementById('moontonPassword').value;
        const secondaryPassword = document.getElementById('secondaryPassword').value;
        
        if (!id || !email || !googlePassword || !moontonPassword || !secondaryPassword) {
            this.showMessage('All fields are required');
            return false;
        }
        
        if (isNaN(id) || parseInt(id) < 1) {
            this.showMessage('ID must be a positive number');
            return false;
        }
        
        if (this.selectedImages.length === 0) {
            this.showMessage('Please upload at least one image');
            return false;
        }
        
        return true;
    }

    async submitForm() {
        const form = document.getElementById('addAccountForm');
        const submitText = document.getElementById('submitText');
        const submitSpinner = document.getElementById('submitSpinner');
        
        // Prepare form data
        const formData = new FormData();
        formData.append('id', document.getElementById('accountId').value);
        formData.append('email', document.getElementById('email').value);
        formData.append('google_password', document.getElementById('googlePassword').value);
        formData.append('moonton_password', document.getElementById('moontonPassword').value);
        formData.append('secondary_password', document.getElementById('secondaryPassword').value);
        
        // Append images
        this.selectedImages.forEach(image => {
            formData.append('images', image);
        });
        
        // Show loading state
        submitText.classList.add('hidden');
        submitSpinner.classList.remove('hidden');
        
        try {
            const response = await fetch('/api/accounts', {
                method: 'POST',
                body: formData
            });
            
            const data = await response.json();
            
            if (response.ok) {
                this.showMessage('Account added successfully!', 'success');
                form.reset();
                this.selectedImages = [];
                this.updateImagePreview();
                this.updateImageCount();
            } else {
                throw new Error(data.error || 'Failed to add account');
            }
        } catch (error) {
            this.showMessage(error.message);
        } finally {
            submitText.classList.remove('hidden');
            submitSpinner.classList.add('hidden');
        }
    }

    showMessage(message, type = 'error') {
        const messageElement = document.getElementById('formMessage');
        if (!messageElement) return;
        
        messageElement.textContent = message;
        messageElement.className = `alert alert-${type}`;
        messageElement.classList.remove('hidden');
        
        if (type === 'success') {
            setTimeout(() => {
                messageElement.classList.add('hidden');
            }, 5000);
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new AddAccount();
});