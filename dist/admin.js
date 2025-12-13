// Language translations
let currentLang = 'en';

const translations = {
    en: {
        headerTitle: 'IP Whitelist Manager',
        langBtn: '🌐 RU',
        logoutBtn: '🚪 Logout',
        currentIpTitle: 'Your Current IP',
        addMyIpBtn: '➕ Add My IP',
        addNewTitle: '➕ Add New IP Address',
        ipLabel: 'IP Address',
        descLabel: 'Description (optional)',
        addBtn: '➕ Add IP Address',
        ipListTitle: '📋 Authorized IP Addresses',
        ipCount: '0 IPs',
        thIP: 'IP Address',
        thDesc: 'Description',
        thStatus: 'Status',
        thLastAccess: 'Last Access',
        thActions: 'Actions',
        emptyText: 'No IP addresses added yet',
        statusActive: '✅ Active',
        statusInactive: '❌ Inactive',
        btnDisable: 'Disable',
        btnEnable: 'Enable',
        btnDelete: 'Delete',
        toastAdded: 'IP address added successfully!',
        toastError: 'Error: ',
        toastUpdated: 'IP status updated',
        toastDeleted: 'IP address deleted',
        confirmDelete: 'Are you sure you want to delete this IP address?',
        never: 'Never'
    },
    ru: {
        headerTitle: 'Управление IP адресами',
        langBtn: '🌐 EN',
        logoutBtn: '🚪 Выход',
        currentIpTitle: 'Ваш текущий IP',
        addMyIpBtn: '➕ Добавить мой IP',
        addNewTitle: '➕ Добавить новый IP адрес',
        ipLabel: 'IP адрес',
        descLabel: 'Описание (необязательно)',
        addBtn: '➕ Добавить IP адрес',
        ipListTitle: '📋 Авторизованные IP адреса',
        ipCount: '0 IP',
        thIP: 'IP адрес',
        thDesc: 'Описание',
        thStatus: 'Статус',
        thLastAccess: 'Последний доступ',
        thActions: 'Действия',
        emptyText: 'IP адреса ещё не добавлены',
        statusActive: '✅ Активен',
        statusInactive: '❌ Неактивен',
        btnDisable: 'Отключить',
        btnEnable: 'Включить',
        btnDelete: 'Удалить',
        toastAdded: 'IP адрес успешно добавлен!',
        toastError: 'Ошибка: ',
        toastUpdated: 'Статус IP обновлён',
        toastDeleted: 'IP адрес удалён',
        confirmDelete: 'Вы уверены, что хотите удалить этот IP адрес?',
        never: 'Никогда'
    }
};

function t(key) {
    return translations[currentLang][key] || key;
}

// Update UI with current language
function updateUILanguage() {
    document.getElementById('headerTitle').textContent = t('headerTitle');
    document.getElementById('langBtn').textContent = t('langBtn');
    document.getElementById('logoutBtn').textContent = t('logoutBtn');
    document.getElementById('currentIpTitle').textContent = t('currentIpTitle');
    document.getElementById('addMyIpBtn').textContent = t('addMyIpBtn');
    document.getElementById('addNewTitle').textContent = t('addNewTitle');
    document.getElementById('ipLabel').textContent = t('ipLabel');
    document.getElementById('descLabel').textContent = t('descLabel');
    document.getElementById('addBtn').textContent = t('addBtn');
    document.getElementById('ipListTitle').textContent = t('ipListTitle');
    document.getElementById('thIP').textContent = t('thIP');
    document.getElementById('thDesc').textContent = t('thDesc');
    document.getElementById('thStatus').textContent = t('thStatus');
    document.getElementById('thLastAccess').textContent = t('thLastAccess');
    document.getElementById('thActions').textContent = t('thActions');
    document.getElementById('emptyText').textContent = t('emptyText');
}

function toggleLanguage() {
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    updateUILanguage();
    loadIPs(); // Reload table with new language
}

// Toast notifications
function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    document.getElementById('toastContainer').appendChild(toast);
    
    setTimeout(() => {
        toast.style.animation = 'slideInRight 0.4s ease reverse';
        setTimeout(() => toast.remove(), 400);
    }, 3000);
}

// Get current IP
async function getCurrentIP() {
    try {
        const response = await fetch('/admin/api/current-ip');
        const data = await response.json();
        document.getElementById('currentIP').textContent = data.ip;
        return data.ip;
    } catch (error) {
        document.getElementById('currentIP').textContent = 'Unable to detect';
        return null;
    }
}

// Add current IP
async function addCurrentIP() {
    const ip = document.getElementById('currentIP').textContent;
    if (ip === 'Unable to detect' || ip === 'Loading...') {
        showToast('Cannot detect your IP address', 'error');
        return;
    }
    
    document.getElementById('newIP').value = ip;
    document.getElementById('newDesc').value = currentLang === 'en' 
        ? 'Added from admin panel' 
        : 'Добавлено из админ-панели';
}

// Add new IP
async function addIP(event) {
    event.preventDefault();
    
    const ip = document.getElementById('newIP').value.trim();
    const description = document.getElementById('newDesc').value.trim();
    
    try {
        const response = await fetch('/admin/api/ips', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ip, description })
        });
        
        if (response.ok) {
            showToast(t('toastAdded'), 'success');
            document.getElementById('newIP').value = '';
            document.getElementById('newDesc').value = '';
            loadIPs();
        } else {
            const error = await response.json();
            showToast(t('toastError') + error.error, 'error');
        }
    } catch (error) {
        showToast(t('toastError') + error.message, 'error');
    }
}

// Load IPs
async function loadIPs() {
    try {
        const response = await fetch('/admin/api/ips');
        const ips = await response.json();
        
        const tbody = document.getElementById('ipTableBody');
        const ipCount = document.getElementById('ipCount');
        
        if (ips.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" class="empty-state">
                        <div class="empty-icon">📭</div>
                        <p>${t('emptyText')}</p>
                    </td>
                </tr>
            `;
            ipCount.textContent = currentLang === 'en' ? '0 IPs' : '0 IP';
            return;
        }
        
        ipCount.textContent = currentLang === 'en' 
            ? `${ips.length} IP${ips.length !== 1 ? 's' : ''}` 
            : `${ips.length} IP`;
        
        tbody.innerHTML = ips.map(ip => `
            <tr>
                <td>
                    <span class="ip-code">${ip.ip}</span>
                </td>
                <td>${ip.description || '-'}</td>
                <td>
                    <span class="status-badge ${ip.isActive ? 'status-active' : 'status-inactive'}">
                        ${ip.isActive ? t('statusActive') : t('statusInactive')}
                    </span>
                </td>
                <td>${formatDate(ip.lastAccess)}</td>
                <td>
                    <div class="actions">
                        <button 
                            class="btn-sm ${ip.isActive ? 'btn-danger' : 'btn-success'}" 
                            onclick="toggleIP(${ip.id}, ${!ip.isActive})"
                        >
                            ${ip.isActive ? t('btnDisable') : t('btnEnable')}
                        </button>
                        <button class="btn-sm btn-danger" onclick="deleteIP(${ip.id})">
                            ${t('btnDelete')}
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        showToast(t('toastError') + error.message, 'error');
    }
}

// Toggle IP status
async function toggleIP(id, active) {
    try {
        const response = await fetch(`/admin/api/ips/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ is_active: active })
        });
        
        if (response.ok) {
            showToast(t('toastUpdated'), 'success');
            loadIPs();
        } else {
            throw new Error('Failed to update IP');
        }
    } catch (error) {
        showToast(t('toastError') + error.message, 'error');
    }
}

// Delete IP
async function deleteIP(id) {
    if (!confirm(t('confirmDelete'))) return;
    
    try {
        const response = await fetch(`/admin/api/ips/${id}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            showToast(t('toastDeleted'), 'success');
            loadIPs();
        } else {
            throw new Error('Failed to delete IP');
        }
    } catch (error) {
        showToast(t('toastError') + error.message, 'error');
    }
}

// Format date
function formatDate(dateString) {
    if (!dateString) return t('never');
    
    const date = new Date(dateString);
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return date.toLocaleDateString(currentLang === 'ru' ? 'ru-RU' : 'en-US', options);
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    getCurrentIP();
    loadIPs();
    updateUILanguage();
});