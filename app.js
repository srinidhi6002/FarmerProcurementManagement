/**
 * AgriProcure - Farmer Procurement & Mandi Management System
 * Full-Stack App Controller with Neon PostgreSQL API & Local Fallback
 */

class AgriProcureApp {
    constructor() {
        this.api = window.api;
        this.currentFarmer = null;
        this.centers = [];
        this.farmers = [];
        this.intakeRecords = [];
        this.weighbridgeSlips = [];
        this.payouts = [];
        this.mspRates = {};
        this.stats = {
            totalFarmers: 0,
            totalProcurementQtl: "0.00",
            totalDisbursedPayouts: "0.00",
            totalPendingPayouts: "0.00",
            activeQueueCount: 0
        };

        this.init();
    }

    async init() {
        this.initDOM();
        this.bindEvents();
        await this.loadAllData();
        this.renderAll();
    }

    initDOM() {
        this.navButtons = document.querySelectorAll('.nav-item');
        this.tabViews = document.querySelectorAll('.tab-view');
        
        // Modals
        this.modalFarmer = document.getElementById('modal-farmer');
        this.modalIntake = document.getElementById('modal-intake');
        this.modalVoucher = document.getElementById('modal-voucher');
        this.modalSlot = document.getElementById('modal-slot');
    }

    bindEvents() {
        // Nav tab click
        this.navButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.getAttribute('data-tab');
                this.switchTab(targetTab);
            });
        });

        // Quick action buttons
        document.getElementById('btn-quick-intake')?.addEventListener('click', () => this.openModal('modal-intake'));
        document.getElementById('btn-new-intake-modal')?.addEventListener('click', () => this.openModal('modal-intake'));
        document.getElementById('btn-add-farmer')?.addEventListener('click', () => this.openModal('modal-farmer'));
        document.getElementById('btn-book-slot-modal')?.addEventListener('click', () => this.openModal('modal-slot'));

        // Search & Filters
        document.getElementById('global-search')?.addEventListener('input', (e) => this.handleGlobalSearch(e.target.value));
        document.getElementById('farmer-search-input')?.addEventListener('input', () => this.renderFarmers());

        // Form submit handlers
        document.getElementById('form-register-farmer')?.addEventListener('submit', (e) => this.handleRegisterFarmer(e));
        document.getElementById('form-new-intake')?.addEventListener('submit', (e) => this.handleNewIntake(e));
        document.getElementById('form-book-slot')?.addEventListener('submit', (e) => this.handleBookSlot(e));
        document.getElementById('weighbridge-form')?.addEventListener('submit', (e) => this.handleWeighbridgeSubmit(e));

        // Intake Payout preview dynamic calculation
        document.getElementById('in-crop-type')?.addEventListener('change', () => this.updatePayoutPreview());
        document.getElementById('in-quantity')?.addEventListener('input', () => this.updatePayoutPreview());
        document.getElementById('in-grade')?.addEventListener('change', () => this.updatePayoutPreview());

        // Weighbridge Net weight calculation
        document.getElementById('wb-gross-weight')?.addEventListener('input', () => this.calcWeighbridgeNet());
        document.getElementById('wb-tare-weight')?.addEventListener('input', () => this.calcWeighbridgeNet());
    }

    async loadAllData() {
        try {
            // Check health & DB status
            const health = await this.api.getHealth().catch(() => null);
            const dbBadge = document.getElementById('db-status-pill');
            if (dbBadge) {
                if (health && health.database && health.database.status && health.database.status.includes('Connected')) {
                    dbBadge.innerHTML = `<span class="pulse-dot-green"></span> ⚡ Neon Cloud DB: Connected`;
                    dbBadge.className = 'status-pill connected';
                    dbBadge.title = 'Connected to Neon PostgreSQL cloud database';
                } else if (health && health.status === 'Online') {
                    dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> ⚙️ Render Live | DB Not Configured`;
                    dbBadge.className = 'status-pill fallback';
                    dbBadge.title = 'Render backend is online! Please add DATABASE_URL in Render Dashboard -> Environment';
                } else {
                    dbBadge.innerHTML = `<span class="pulse-dot-amber"></span> 📁 Local Demo Mode`;
                    dbBadge.className = 'status-pill fallback';
                }
            }

            // Fetch Stats
            const statsRes = await this.api.getDashboardStats().catch(() => null);
            if (statsRes && statsRes.stats) this.stats = statsRes.stats;

            // Fetch Farmers
            const farmersRes = await this.api.getFarmers().catch(() => null);
            if (farmersRes && farmersRes.farmers) this.farmers = farmersRes.farmers;

            // Fetch Centers
            const centersRes = await this.api.getCenters().catch(() => null);
            if (centersRes && centersRes.centers) this.centers = centersRes.centers;

            // Fetch Queue / Intake
            const queueRes = await this.api.getQueue().catch(() => null);
            if (queueRes && queueRes.queue) this.intakeRecords = queueRes.queue;

            // Fetch Payouts
            const payoutsRes = await this.api.getPayouts().catch(() => null);
            if (payoutsRes && payoutsRes.payouts) this.payouts = payoutsRes.payouts;

            // Fetch MSP
            const mspRes = await this.api.getMspRates().catch(() => null);
            if (mspRes && mspRes.rates) {
                this.mspRates = {};
                mspRes.rates.forEach(r => {
                    this.mspRates[r.crop_name] = { rate: parseFloat(r.msp_per_qtl), maxMoisture: parseFloat(r.max_moisture_pct), category: r.category };
                });
            }
        } catch (err) {
            console.warn('Error loading cloud data, using local state:', err);
        }
    }

    switchTab(tabId) {
        this.navButtons.forEach(btn => btn.classList.toggle('active', btn.getAttribute('data-tab') === tabId));
        this.tabViews.forEach(view => view.classList.toggle('active', view.id === `view-${tabId}`));
    }

    openModal(modalId) {
        this.populateDropdowns();
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    }

    closeModals() {
        document.querySelectorAll('.modal-backdrop').forEach(m => m.classList.remove('active'));
    }

    populateDropdowns() {
        const farmerSelect = document.getElementById('in-farmer-id');
        const slotFarmerSelect = document.getElementById('slot-farmer-id');
        if (farmerSelect && this.farmers.length > 0) {
            farmerSelect.innerHTML = this.farmers.map(f => `<option value="${f.id}">${f.name} (${f.village} - ${f.farmer_code || f.id})</option>`).join('');
        }
        if (slotFarmerSelect && this.farmers.length > 0) {
            slotFarmerSelect.innerHTML = this.farmers.map(f => `<option value="${f.id}">${f.name} (${f.village} - ${f.farmer_code || f.id})</option>`).join('');
        }

        const centerSelect = document.getElementById('slot-center-id');
        if (centerSelect && this.centers.length > 0) {
            centerSelect.innerHTML = this.centers.map(c => `<option value="${c.id}">${c.name} (${c.district})</option>`).join('');
        }

        const wbTokenSelect = document.getElementById('wb-token-select');
        if (wbTokenSelect) {
            wbTokenSelect.innerHTML = this.intakeRecords.map(rec => `<option value="${rec.id || rec.token}">${rec.token || rec.booking_token} - ${rec.farmerName || rec.farmer_name} (${rec.crop || rec.crop_name})</option>`).join('');
        }
    }

    updatePayoutPreview() {
        const crop = document.getElementById('in-crop-type')?.value;
        const qty = parseFloat(document.getElementById('in-quantity')?.value) || 0;
        const grade = document.getElementById('in-grade')?.value;

        const baseMsp = this.mspRates[crop]?.rate || 2183;
        let finalRate = baseMsp;
        if (grade === "Grade B") finalRate -= 50;
        if (grade === "Below Spec" || grade === "Rejected") finalRate = 0;

        const total = qty * finalRate;
        const elem = document.getElementById('in-payout-preview');
        if (elem) elem.textContent = `₹ ${total.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
    }

    calcWeighbridgeNet() {
        const gross = parseFloat(document.getElementById('wb-gross-weight')?.value) || 0;
        const tare = parseFloat(document.getElementById('wb-tare-weight')?.value) || 0;
        const netKg = Math.max(0, gross - tare);
        const netQtl = (netKg / 100).toFixed(2);
        const elem = document.getElementById('wb-calculated-net');
        if (elem) elem.textContent = `${netQtl} Quintals`;
    }

    async handleRegisterFarmer(e) {
        e.preventDefault();
        const farmerData = {
            name: document.getElementById('f-name').value,
            phone: document.getElementById('f-phone').value,
            aadhaar: document.getElementById('f-aadhaar').value,
            village: document.getElementById('f-village').value,
            landAcres: parseFloat(document.getElementById('f-land').value) || 1.0,
            bankName: document.getElementById('f-bank-name').value,
            bankAcc: document.getElementById('f-bank-acc').value,
            ifsc: document.getElementById('f-ifsc').value
        };

        try {
            const res = await this.api.registerFarmer(farmerData);
            showToast(`Farmer ${farmerData.name} registered successfully! Token/Code: ${res.farmer?.farmer_code || 'F-OK'}`);
            this.closeModals();
            await this.loadAllData();
            this.renderAll();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleBookSlot(e) {
        e.preventDefault();
        const bookingData = {
            farmerId: document.getElementById('slot-farmer-id').value,
            centerId: document.getElementById('slot-center-id').value,
            cropName: document.getElementById('slot-crop-name').value,
            estimatedQtl: parseFloat(document.getElementById('slot-quantity').value),
            vehicleNo: document.getElementById('slot-vehicle').value || 'UP 32 AB 1234'
        };

        try {
            const res = await this.api.bookSlot(bookingData);
            showToast(`Slot Booked Successfully! Token ID: ${res.bookingToken}`, 'success');
            this.closeModals();
            await this.loadAllData();
            this.renderAll();
            this.switchTab('queue');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleNewIntake(e) {
        e.preventDefault();
        const farmerId = document.getElementById('in-farmer-id').value;
        const crop = document.getElementById('in-crop-type').value;
        const qty = parseFloat(document.getElementById('in-quantity').value);

        try {
            const res = await this.api.bookSlot({
                farmerId,
                centerId: 1,
                cropName: crop,
                estimatedQtl: qty,
                vehicleNo: document.getElementById('in-vehicle').value || "UP 32 AB 1001"
            });
            showToast(`Procurement token ${res.bookingToken} created successfully!`);
            this.closeModals();
            await this.loadAllData();
            this.renderAll();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleWeighbridgeSubmit(e) {
        e.preventDefault();
        const bookingId = document.getElementById('wb-token-select').value;
        const grossKg = parseFloat(document.getElementById('wb-gross-weight').value);
        const tareKg = parseFloat(document.getElementById('wb-tare-weight').value);
        const moisturePct = parseFloat(document.getElementById('wb-moisture').value || 13.5);
        const impurityPct = parseFloat(document.getElementById('wb-impurity').value || 1.0);

        try {
            const res = await this.api.submitInspection({
                bookingId,
                grossKg,
                tareKg,
                moisturePct,
                impurityPct,
                inspectorName: 'Chief Mandi Inspector'
            });
            showToast(`Quality & Net Weight (${res.inspection?.net_weight_qtl} Qtl) verified and saved to Neon DB!`);
            await this.loadAllData();
            this.renderAll();
            this.switchTab('payments');
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    async handleDisbursePayment(payoutId) {
        if (!confirm('Approve and process Direct Benefit Transfer (DBT) payment to farmer bank account?')) return;
        try {
            const res = await this.api.disbursePayout(payoutId);
            showToast(`DBT Payment of ₹${parseFloat(res.payout?.total_amount).toLocaleString()} disbursed successfully!`, 'success');
            await this.loadAllData();
            this.renderAll();
        } catch (err) {
            showToast(err.message, 'error');
        }
    }

    renderAll() {
        this.renderStats();
        this.renderFarmers();
        this.renderQueue();
        this.renderPayouts();
    }

    renderStats() {
        if (document.getElementById('stat-farmer-count')) document.getElementById('stat-farmer-count').textContent = this.stats.totalFarmers;
        if (document.getElementById('stat-total-volume')) document.getElementById('stat-total-volume').textContent = `${this.stats.totalProcurementQtl} Qtl`;
        if (document.getElementById('stat-total-payout')) document.getElementById('stat-total-payout').textContent = `₹ ${parseFloat(this.stats.totalDisbursedPayouts).toLocaleString('en-IN')}`;
        if (document.getElementById('stat-pending-payout')) document.getElementById('stat-pending-payout').textContent = `₹ ${parseFloat(this.stats.totalPendingPayouts).toLocaleString('en-IN')}`;
    }

    renderFarmers() {
        const tbody = document.getElementById('table-farmers-body');
        if (!tbody) return;

        const query = document.getElementById('farmer-search-input')?.value.toLowerCase() || '';
        const filtered = this.farmers.filter(f => 
            f.name.toLowerCase().includes(query) || 
            f.village.toLowerCase().includes(query) || 
            (f.farmer_code && f.farmer_code.toLowerCase().includes(query)) ||
            (f.phone && f.phone.includes(query))
        );

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No registered farmer records found.</td></tr>`;
            return;
        }

        tbody.innerHTML = filtered.map(f => `
            <tr>
                <td><strong>${f.farmer_code || f.id}</strong></td>
                <td>${f.name}</td>
                <td>${f.phone}</td>
                <td>${f.village}</td>
                <td>${f.land_acres || f.landAcres || 1.0} Acres</td>
                <td>${f.bank_name || f.bankName} (${(f.bank_acc || f.bankAcc || '').slice(-4)})</td>
                <td><span class="badge badge-success">${f.status || 'Verified'}</span></td>
            </tr>
        `).join('');
    }

    renderQueue() {
        const tbody = document.getElementById('table-intake-body');
        const dashboardTbody = document.getElementById('dashboard-intake-body');
        if (!tbody && !dashboardTbody) return;

        const rowsHtml = this.intakeRecords.map(rec => {
            const token = rec.token || rec.booking_token;
            const farmerName = rec.farmerName || rec.farmer_name;
            const crop = rec.crop || rec.crop_name;
            const qty = rec.quantityQtl || rec.estimated_qtl;
            const status = rec.status || 'Booked';
            const payout = rec.totalPayout || rec.total_amount || 0;
            const statusBadge = status === 'Completed' ? 'badge-success' : status === 'Inspected' ? 'badge-info' : 'badge-warning';

            return `
                <tr>
                    <td><strong>${token}</strong></td>
                    <td>${farmerName}</td>
                    <td>${crop}</td>
                    <td>${qty} Qtl</td>
                    <td><span class="badge ${statusBadge}">${status}</span></td>
                    <td>₹ ${parseFloat(payout).toLocaleString('en-IN')}</td>
                    <td>
                        <button class="btn btn-xs btn-secondary" onclick="app.showVoucher('${token}')">Receipt</button>
                    </td>
                </tr>
            `;
        }).join('');

        if (tbody) tbody.innerHTML = rowsHtml || `<tr><td colspan="7" class="text-center py-4">No active tokens in queue.</td></tr>`;
        if (dashboardTbody) dashboardTbody.innerHTML = rowsHtml || `<tr><td colspan="7" class="text-center py-4">No recent procurement entries.</td></tr>`;
    }

    renderPayouts() {
        const tbody = document.getElementById('table-payments-body');
        if (!tbody) return;

        if (this.payouts.length === 0) {
            tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4">No DBT payouts generated yet.</td></tr>`;
            return;
        }

        tbody.innerHTML = this.payouts.map(p => {
            const status = p.paymentStatus || p.payment_status;
            const isDisbursed = status === 'Disbursed';
            const badgeClass = isDisbursed ? 'badge-success' : status === 'Approved' ? 'badge-info' : 'badge-warning';

            return `
                <tr>
                    <td><strong>${p.txnRef || p.transaction_ref}</strong></td>
                    <td>${p.farmerName || p.farmer_name}</td>
                    <td>${p.crop} (${p.netQtl || p.net_quantity_qtl} Qtl)</td>
                    <td>${p.bankName || p.bank_name} (${(p.bankAcc || p.bank_acc || '').slice(-4)})</td>
                    <td><strong>₹ ${parseFloat(p.totalPayout || p.total_amount).toLocaleString('en-IN')}</strong></td>
                    <td><span class="badge ${badgeClass}">${status}</span></td>
                    <td>
                        ${isDisbursed ? '<span class="text-success">Paid ✓</span>' : `<button class="btn btn-sm btn-success" onclick="app.handleDisbursePayment(${p.id})">Disburse DBT</button>`}
                    </td>
                </tr>
            `;
        }).join('');
    }

    showVoucher(token) {
        const rec = this.intakeRecords.find(i => (i.token || i.booking_token) === token);
        if (!rec) return;

        const printArea = document.getElementById('voucher-print-area');
        if (printArea) {
            printArea.innerHTML = `
                <div class="voucher-container" style="border: 2px solid #10B981; padding: 25px; border-radius: 12px; font-family: 'Inter', sans-serif;">
                    <div style="text-align: center; border-bottom: 2px dashed #E5E7EB; padding-bottom: 15px; margin-bottom: 20px;">
                        <h2 style="color: #065F46; margin: 0;">🌾 AGRI-PROCURE MANDI SAMITI</h2>
                        <p style="color: #4B5563; margin: 5px 0;">Govt. Minimum Support Price (MSP) Receipt Voucher</p>
                        <strong style="background: #D1FAE5; color: #065F46; padding: 4px 12px; border-radius: 20px;">TOKEN: ${token}</strong>
                    </div>

                    <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                        <tr><td style="padding: 8px 0; color: #6B7280;">Farmer Name:</td><td><strong>${rec.farmerName || rec.farmer_name}</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Crop Commodity:</td><td><strong>${rec.crop || rec.crop_name}</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Quantity Intake:</td><td><strong>${rec.quantityQtl || rec.estimated_qtl} Quintals</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Assigned Status:</td><td><strong style="color: #10B981;">${rec.status || 'Verified'}</strong></td></tr>
                        <tr><td style="padding: 8px 0; color: #6B7280;">Calculated Payout:</td><td><strong style="font-size: 18px; color: #059669;">₹ ${parseFloat(rec.totalPayout || rec.total_amount || 0).toLocaleString('en-IN')}</strong></td></tr>
                    </table>

                    <div style="margin-top: 25px; padding-top: 15px; border-top: 1px solid #E5E7EB; display: flex; justify-content: space-between; font-size: 12px; color: #9CA3AF;">
                        <span>Generated via Neon PostgreSQL Cloud DB</span>
                        <span>Authorized Officer Sign</span>
                    </div>
                </div>
            `;
            this.openModal('modal-voucher');
        }
    }

    handleGlobalSearch(query) {
        if (!query) return;
        this.switchTab('farmers');
        const input = document.getElementById('farmer-search-input');
        if (input) {
            input.value = query;
            this.renderFarmers();
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    window.app = new AgriProcureApp();
});
