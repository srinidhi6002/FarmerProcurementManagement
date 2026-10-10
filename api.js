/**
 * AgriProcure REST API Client Bridge
 * Connects Vercel Frontend to Render Backend API (Neon Cloud PostgreSQL)
 */

class AgriProcureAPI {
    constructor() {
        // Auto-detect production vs local backend server URL
        const hostname = window.location.hostname;
        if (window.ENV_API_URL) {
            this.baseUrl = window.ENV_API_URL;
        } else if (hostname === 'localhost' || hostname === '127.0.0.1') {
            this.baseUrl = 'http://localhost:5000/api';
        } else {
            // Default Render Production Backend URL (or relative proxy)
            this.baseUrl = 'https://agriprocure-backend-api.onrender.com/api';
        }

        this.isOnline = true;
        this.checkConnection();
    }

    async checkConnection() {
        try {
            const response = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
            const data = await response.json();
            if (data.status === 'Online') {
                this.isOnline = true;
                console.log('✅ Backend API Connected:', this.baseUrl, data);
            }
        } catch (err) {
            this.isOnline = false;
            console.warn('⚠️ Backend API disconnected. Operating in local storage mode:', err.message);
        }
    }

    async request(endpoint, options = {}) {
        const url = `${this.baseUrl}${endpoint}`;
        const headers = {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        };

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.message || `API Error: ${response.statusText}`);
            }
            return data;
        } catch (error) {
            console.error(`API Request Failed [${options.method || 'GET'} ${endpoint}]:`, error.message);
            throw error;
        }
    }

    // API Methods
    async getHealth() { return this.request('/health'); }
    async getDashboardStats() { return this.request('/admin/dashboard-stats'); }
    async getFarmers() { return this.request('/farmers'); }
    async registerFarmer(farmerData) { return this.request('/farmers', { method: 'POST', body: JSON.stringify(farmerData) }); }
    async getCenters() { return this.request('/centers'); }
    async getCenterSlots(centerId) { return this.request(`/centers/${centerId}/slots`); }
    async bookSlot(bookingData) { return this.request('/centers/book-slot', { method: 'POST', body: JSON.stringify(bookingData) }); }
    async getQueue() { return this.request('/queue'); }
    async updateQueueStatus(id, status) { return this.request(`/queue/${id}/status`, { method: 'PUT', body: JSON.stringify({ status }) }); }
    async submitInspection(inspectionData) { return this.request('/verification/inspect', { method: 'POST', body: JSON.stringify(inspectionData) }); }
    async getPayouts() { return this.request('/payouts'); }
    async disbursePayout(payoutId) { return this.request(`/payouts/${payoutId}/disburse`, { method: 'PUT' }); }
    async getMspRates() { return this.request('/admin/msp'); }
}

// Global Toast Notification Helper
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        container.style.cssText = 'position: fixed; bottom: 20px; right: 20px; z-index: 9999; display: flex; flex-direction: column; gap: 10px;';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const bg = type === 'success' ? '#10B981' : type === 'error' ? '#EF4444' : '#F59E0B';
    toast.style.cssText = `background: ${bg}; color: #fff; padding: 12px 20px; border-radius: 8px; font-weight: 500; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.3); transition: all 0.3s ease; transform: translateY(20px); opacity: 0;`;
    toast.innerHTML = `<span>${type === 'success' ? '✅' : type === 'error' ? '❌' : 'ℹ️'} ${message}</span>`;

    container.appendChild(toast);
    setTimeout(() => {
        toast.style.transform = 'translateY(0)';
        toast.style.opacity = '1';
    }, 10);

    setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Attach globally
window.api = new AgriProcureAPI();
