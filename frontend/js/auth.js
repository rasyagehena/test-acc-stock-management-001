class Auth {
    constructor() {
        this.apiBase = '/api';
        this.checkAuth();
    }

    async checkAuth() {
        // Skip auth check on login page
        if (window.location.pathname.includes('login.html')) return;

        try {
            const response = await fetch(`${this.apiBase}/accounts`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            if (response.status === 401) {
                window.location.href = 'login.html';
                return false;
            }

            return response.ok;
        } catch (error) {
            console.error('Auth check failed:', error);
            window.location.href = 'login.html';
            return false;
        }
    }

    async login(username, password) {
        try {
            const response = await fetch(`${this.apiBase}/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();

            if (data.success) {
                // Session is stored in HTTP-only cookie, no need to handle in JS
                window.location.href = 'index.html';
                return true;
            } else {
                throw new Error(data.error || 'Login failed');
            }
        } catch (error) {
            throw error;
        }
    }

    async logout() {
        try {
            await fetch(`${this.apiBase}/logout`, {
                method: 'POST',
                headers: this.getHeaders()
            });
            
            // Clear any client-side storage
            localStorage.clear();
            sessionStorage.clear();
            
            window.location.href = 'login.html';
        } catch (error) {
            console.error('Logout failed:', error);
            window.location.href = 'login.html';
        }
    }

    getHeaders() {
        return {
            'Content-Type': 'application/json'
        };
    }

    showMessage(elementId, message, type = 'error') {
        const element = document.getElementById(elementId);
        if (!element) return;

        element.textContent = message;
        element.className = `alert alert-${type}`;
        element.classList.remove('hidden');

        if (type === 'success') {
            setTimeout(() => {
                element.classList.add('hidden');
            }, 3000);
        }
    }
}

// Initialize auth and attach event listeners
document.addEventListener('DOMContentLoaded', () => {
    const auth = new Auth();

    // Login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;
            const loginText = document.getElementById('loginText');
            const loginSpinner = document.getElementById('loginSpinner');
            
            loginText.classList.add('hidden');
            loginSpinner.classList.remove('hidden');
            
            try {
                await auth.login(username, password);
            } catch (error) {
                auth.showMessage('loginMessage', error.message);
                loginText.classList.remove('hidden');
                loginSpinner.classList.add('hidden');
            }
        });
    }

    // Logout button
    const logoutBtn = document.getElementById('logoutBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', () => {
            auth.logout();
        });
    }
});