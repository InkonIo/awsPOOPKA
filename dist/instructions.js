// Instructions Animation Controller
class InstructionsAnimator {
    constructor() {
        this.cursor = document.getElementById('cursor');
        this.isPlaying = true;
        this.isPaused = false;
        this.currentStep = 1;
        this.animationTimeout = null;
        
        // Elements
        this.menuBtn = document.getElementById('menuBtn');
        this.dropdown = document.getElementById('dropdown');
        this.exportOption = document.getElementById('exportOption');
        this.exportModal = document.getElementById('exportModal');
        this.exportBtn = document.getElementById('exportBtn');
        this.flyingFile = document.getElementById('flyingFile');
        this.uploadZone = document.getElementById('uploadZone');
        this.uploadSuccess = document.getElementById('uploadSuccess');
        
        // Controls
        this.replayBtn = document.getElementById('replayBtn');
        this.pauseBtn = document.getElementById('pauseBtn');
        this.pauseIcon = document.getElementById('pauseIcon');
        this.playIcon = document.getElementById('playIcon');
        
        // Language
        this.currentLang = 'en';
        
        this.init();
    }
    
    init() {
        // Control buttons
        if (this.replayBtn) this.replayBtn.addEventListener('click', () => this.replay());
        if (this.pauseBtn) this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        // Language toggle
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeLanguage(e.target.dataset.lang));
        });
        
        // Start animation only if elements exist
        if (this.menuBtn && this.cursor) {
            this.startAnimation();
        }
    }
    
    // Translations
    translations = {
        en: {
            step1: 'Open menu',
            step2: 'Export chat',
            step3: 'Select JSON',
            step4: 'Upload file',
            forward: 'Forward',
            copy: 'Copy',
            exportChat: 'Export chat history',
            info: 'Info',
            exportSettings: 'Export Settings',
            format: 'Format',
            photos: 'Photos',
            videos: 'Videos',
            voiceMessages: 'Voice messages',
            stickers: 'Stickers',
            export: 'Export',
            dropHere: 'Drop JSON file here',
            orClick: 'or click to browse',
            uploadComplete: 'Upload Complete!',
            newQuestions: 'New Questions',
            duplicates: 'Duplicates',
            replay: 'Replay',
            pause: 'Pause',
            play: 'Play',
            stepByStep: 'Step-by-Step Guide',
            openBot: 'Open the Telegram Bot',
            openBotDesc: 'Go to @c1oud_uib_aws_cp2_bot in Telegram',
            tapMenu: 'Tap the Menu',
            tapMenuDesc: 'Click the three dots (⋮) in the top right corner of the chat',
            selectExport: 'Select "Export chat history"',
            selectExportDesc: 'Choose JSON format and uncheck all media options (photos, videos, etc.)',
            uploadFile: 'Upload the JSON File',
            uploadFileDesc: 'Drag and drop the result.json file onto the upload area on our website',
            privacyTitle: 'Your Data is Safe',
            privacy1: '✅ Only quiz questions are extracted',
            privacy2: '✅ Personal messages are ignored',
            privacy3: '✅ No user data is stored',
            privacy4: '✅ Duplicates are automatically removed',
            readyUpload: 'Ready to Upload?'
        },
        ru: {
            step1: 'Открыть меню',
            step2: 'Экспорт чата',
            step3: 'Выбрать JSON',
            step4: 'Загрузить файл',
            forward: 'Переслать',
            copy: 'Копировать',
            exportChat: 'Экспорт истории чата',
            info: 'Информация',
            exportSettings: 'Настройки экспорта',
            format: 'Формат',
            photos: 'Фото',
            videos: 'Видео',
            voiceMessages: 'Голосовые сообщения',
            stickers: 'Стикеры',
            export: 'Экспортировать',
            dropHere: 'Перетащите JSON файл сюда',
            orClick: 'или нажмите для выбора',
            uploadComplete: 'Загрузка завершена!',
            newQuestions: 'Новых вопросов',
            duplicates: 'Дубликатов',
            replay: 'Повторить',
            pause: 'Пауза',
            play: 'Играть',
            stepByStep: 'Пошаговая инструкция',
            openBot: 'Откройте Telegram бота',
            openBotDesc: 'Перейдите к @c1oud_uib_aws_cp2_bot в Telegram',
            tapMenu: 'Нажмите на меню',
            tapMenuDesc: 'Кликните на три точки (⋮) в правом верхнем углу чата',
            selectExport: 'Выберите "Экспорт истории чата"',
            selectExportDesc: 'Выберите формат JSON и снимите галочки со всех медиа-опций (фото, видео и т.д.)',
            uploadFile: 'Загрузите JSON файл',
            uploadFileDesc: 'Перетащите файл result.json в область загрузки на нашем сайте',
            privacyTitle: 'Ваши данные в безопасности',
            privacy1: '✅ Извлекаются только вопросы теста',
            privacy2: '✅ Личные сообщения игнорируются',
            privacy3: '✅ Данные пользователей не сохраняются',
            privacy4: '✅ Дубликаты автоматически удаляются',
            readyUpload: 'Готовы загрузить?'
        }
    };
    
    changeLanguage(lang) {
        this.currentLang = lang;
        
        // Update button states
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.lang === lang);
        });
        
        // Update all translatable elements
        document.querySelectorAll('[data-translate]').forEach(el => {
            const key = el.dataset.translate;
            if (this.translations[lang][key]) {
                el.textContent = this.translations[lang][key];
            }
        });
    }
    
    async moveCursor(x, y, duration = 500) {
        return new Promise(resolve => {
            this.cursor.style.transition = `left ${duration}ms ease, top ${duration}ms ease`;
            this.cursor.style.left = x + 'px';
            this.cursor.style.top = y + 'px';
            setTimeout(resolve, duration);
        });
    }
    
    async click() {
        this.cursor.classList.add('clicking');
        await this.wait(150);
        this.cursor.classList.remove('clicking');
        await this.wait(100);
    }
    
    wait(ms) {
        return new Promise(resolve => {
            this.animationTimeout = setTimeout(resolve, ms);
        });
    }
    
    setStep(step) {
        this.currentStep = step;
        document.querySelectorAll('.step').forEach(s => {
            const stepNum = parseInt(s.dataset.step);
            s.classList.remove('active', 'completed');
            if (stepNum === step) {
                s.classList.add('active');
            } else if (stepNum < step) {
                s.classList.add('completed');
            }
        });
    }
    
    resetState() {
        // Hide all modals and dropdowns
        this.dropdown.classList.add('hidden');
        this.exportModal.classList.add('hidden');
        this.flyingFile.classList.remove('flying');
        this.uploadZone.classList.remove('active', 'dropping', 'hidden');
        this.uploadSuccess.classList.add('hidden');
        this.menuBtn.classList.remove('active');
        
        // Reset cursor
        this.cursor.classList.remove('visible');
        
        // Reset steps
        this.setStep(1);
    }
    
    async startAnimation() {
        this.resetState();
        
        // Get positions relative to animation container
        const container = document.querySelector('.animation-container');
        const containerRect = container.getBoundingClientRect();
        
        // Show cursor
        await this.wait(500);
        this.cursor.classList.add('visible');
        
        // Initial cursor position (center)
        const phoneRect = document.querySelector('.phone-mockup').getBoundingClientRect();
        let startX = phoneRect.left - containerRect.left + phoneRect.width / 2;
        let startY = phoneRect.top - containerRect.top + phoneRect.height / 2;
        
        this.cursor.style.left = startX + 'px';
        this.cursor.style.top = startY + 'px';
        
        await this.wait(300);
        
        // Step 1: Click on menu button
        this.setStep(1);
        const menuRect = this.menuBtn.getBoundingClientRect();
        let menuX = menuRect.left - containerRect.left + menuRect.width / 2;
        let menuY = menuRect.top - containerRect.top + menuRect.height / 2;
        
        await this.moveCursor(menuX, menuY, 800);
        if (!this.isPlaying) return;
        
        await this.click();
        this.menuBtn.classList.add('active');
        this.dropdown.classList.remove('hidden');
        
        await this.wait(600);
        if (!this.isPlaying) return;
        
        // Step 2: Click on Export option
        this.setStep(2);
        const exportRect = this.exportOption.getBoundingClientRect();
        let exportX = exportRect.left - containerRect.left + exportRect.width / 2;
        let exportY = exportRect.top - containerRect.top + exportRect.height / 2;
        
        await this.moveCursor(exportX, exportY, 600);
        if (!this.isPlaying) return;
        
        await this.click();
        this.dropdown.classList.add('hidden');
        this.exportModal.classList.remove('hidden');
        
        await this.wait(800);
        if (!this.isPlaying) return;
        
        // Step 3: Click Export button
        this.setStep(3);
        const exportBtnRect = this.exportBtn.getBoundingClientRect();
        let btnX = exportBtnRect.left - containerRect.left + exportBtnRect.width / 2;
        let btnY = exportBtnRect.top - containerRect.top + exportBtnRect.height / 2;
        
        await this.moveCursor(btnX, btnY, 600);
        if (!this.isPlaying) return;
        
        await this.click();
        this.exportModal.classList.add('hidden');
        this.menuBtn.classList.remove('active');
        
        // Show flying file
        this.flyingFile.classList.add('flying');
        
        await this.wait(1000);
        if (!this.isPlaying) return;
        
        // Step 4: Move to upload zone
        this.setStep(4);
        const uploadRect = this.uploadZone.getBoundingClientRect();
        let uploadX = uploadRect.left - containerRect.left + uploadRect.width / 2;
        let uploadY = uploadRect.top - containerRect.top + uploadRect.height / 2;
        
        await this.moveCursor(uploadX, uploadY, 1000);
        if (!this.isPlaying) return;
        
        // Highlight upload zone
        this.uploadZone.classList.add('active');
        await this.wait(400);
        
        this.uploadZone.classList.add('dropping');
        await this.wait(300);
        
        await this.click();
        
        // Show success
        this.uploadZone.classList.add('hidden');
        this.uploadSuccess.classList.remove('hidden');
        this.flyingFile.classList.remove('flying');
        
        // Mark all steps complete
        document.querySelectorAll('.step').forEach(s => {
            s.classList.remove('active');
            s.classList.add('completed');
        });
        
        await this.wait(500);
        this.cursor.classList.remove('visible');
        
        // Wait and restart
        await this.wait(3000);
        if (this.isPlaying && !this.isPaused) {
            this.startAnimation();
        }
    }
    
    replay() {
        this.isPlaying = true;
        this.isPaused = false;
        this.updatePauseButton();
        clearTimeout(this.animationTimeout);
        this.startAnimation();
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
        this.isPlaying = !this.isPaused;
        this.updatePauseButton();
        
        if (!this.isPaused) {
            this.startAnimation();
        }
    }
    
    updatePauseButton() {
        if (this.isPaused) {
            this.pauseIcon.classList.add('hidden');
            this.playIcon.classList.remove('hidden');
            this.pauseBtn.querySelector('span').textContent = this.translations[this.currentLang].play;
        } else {
            this.pauseIcon.classList.remove('hidden');
            this.playIcon.classList.add('hidden');
            this.pauseBtn.querySelector('span').textContent = this.translations[this.currentLang].pause;
        }
    }
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    // Check if we're on mobile - don't init animation
    if (window.innerWidth > 768) {
        new InstructionsAnimator();
    }
    
    // Initialize Upload Handler
    new UploadHandler();
});

// Handle resize
let animator = null;
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && !animator) {
        animator = new InstructionsAnimator();
    }
});

// ============================================
// UPLOAD HANDLER CLASS
// ============================================
class UploadHandler {
    constructor() {
        this.modal = document.getElementById('uploadModalOverlay');
        this.dropArea = document.getElementById('uploadDropArea');
        this.fileInput = document.getElementById('fileInput');
        this.uploadProgress = document.getElementById('uploadProgress');
        this.uploadResult = document.getElementById('uploadResult');
        this.resultIcon = document.getElementById('resultIcon');
        this.resultTitle = document.getElementById('resultTitle');
        this.resultStats = document.getElementById('resultStats');
        
        this.currentLang = 'en';
        
        this.translations = {
            en: {
                uploadTitle: 'Upload Telegram JSON',
                dropHere: 'Drop JSON file here',
                orClick: 'or click to browse',
                uploading: 'Uploading...',
                uploadComplete: 'Upload Complete!',
                uploadFailed: 'Upload Failed',
                newQuestions: 'New Questions',
                duplicates: 'Duplicates',
                total: 'Total in DB',
                uploadAnother: 'Upload Another',
                startQuiz: 'Start Quiz →',
                invalidFile: 'Please upload a JSON file',
                networkError: 'Network error. Please try again.'
            },
            ru: {
                uploadTitle: 'Загрузить Telegram JSON',
                dropHere: 'Перетащите JSON файл сюда',
                orClick: 'или нажмите для выбора',
                uploading: 'Загрузка...',
                uploadComplete: 'Загрузка завершена!',
                uploadFailed: 'Ошибка загрузки',
                newQuestions: 'Новых вопросов',
                duplicates: 'Дубликатов',
                total: 'Всего в базе',
                uploadAnother: 'Загрузить ещё',
                startQuiz: 'Начать тест →',
                invalidFile: 'Пожалуйста, загрузите JSON файл',
                networkError: 'Ошибка сети. Попробуйте снова.'
            }
        };
        
        this.init();
    }
    
    init() {
        // CTA button opens modal
        const ctaBtn = document.getElementById('uploadCTA');
        if (ctaBtn) {
            ctaBtn.addEventListener('click', () => this.openModal());
        }
        
        // Close modal
        const closeBtn = document.getElementById('closeModalBtn');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.closeModal());
        }
        
        // Close on overlay click
        if (this.modal) {
            this.modal.addEventListener('click', (e) => {
                if (e.target === this.modal) this.closeModal();
            });
        }
        
        // File input
        if (this.dropArea && this.fileInput) {
            this.dropArea.addEventListener('click', () => this.fileInput.click());
            
            // Drag and drop
            this.dropArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                this.dropArea.classList.add('dragover');
            });
            
            this.dropArea.addEventListener('dragleave', () => {
                this.dropArea.classList.remove('dragover');
            });
            
            this.dropArea.addEventListener('drop', (e) => {
                e.preventDefault();
                this.dropArea.classList.remove('dragover');
                if (e.dataTransfer.files.length) {
                    this.handleFile(e.dataTransfer.files[0]);
                }
            });
            
            this.fileInput.addEventListener('change', (e) => {
                if (e.target.files.length) {
                    this.handleFile(e.target.files[0]);
                }
            });
        }
        
        // Upload another button
        const uploadAnotherBtn = document.getElementById('uploadAnotherBtn');
        if (uploadAnotherBtn) {
            uploadAnotherBtn.addEventListener('click', () => this.resetModal());
        }
        
        // Listen for language changes
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.currentLang = e.target.dataset.lang;
            });
        });
        
        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal && !this.modal.classList.contains('hidden')) {
                this.closeModal();
            }
        });
    }
    
    t(key) {
        return this.translations[this.currentLang][key] || key;
    }
    
    openModal() {
        if (this.modal) {
            this.modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }
    
    closeModal() {
        if (this.modal) {
            this.modal.classList.add('hidden');
            document.body.style.overflow = '';
            this.resetModal();
        }
    }
    
    resetModal() {
        if (this.dropArea) this.dropArea.classList.remove('hidden');
        if (this.uploadProgress) this.uploadProgress.classList.add('hidden');
        if (this.uploadResult) this.uploadResult.classList.add('hidden');
        if (this.fileInput) this.fileInput.value = '';
    }
    
    async handleFile(file) {
        if (!file.name.endsWith('.json')) {
            this.showToast(this.t('invalidFile'), 'error');
            return;
        }
        
        // Show progress
        this.dropArea.classList.add('hidden');
        this.uploadProgress.classList.remove('hidden');
        
        try {
            const text = await file.text();
            const json = JSON.parse(text);
            
            // Determine API base
            const apiBase = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
                ? 'http://localhost:5000/api'
                : '/api';
            
            const response = await fetch(`${apiBase}/questions/upload`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(json)
            });
            
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }
            
            const result = await response.json();
            
            // Show success
            this.uploadProgress.classList.add('hidden');
            this.uploadResult.classList.remove('hidden');
            this.uploadResult.classList.remove('error');
            
            this.resultIcon.textContent = '✅';
            this.resultTitle.textContent = this.t('uploadComplete');
            this.resultStats.innerHTML = `
                <div class="stat">
                    <span class="stat-num">${result.new}</span>
                    <span class="stat-label">${this.t('newQuestions')}</span>
                </div>
                <div class="stat">
                    <span class="stat-num">${result.duplicates}</span>
                    <span class="stat-label">${this.t('duplicates')}</span>
                </div>
                <div class="stat">
                    <span class="stat-num">${result.total}</span>
                    <span class="stat-label">${this.t('total')}</span>
                </div>
            `;
            
            this.showToast(this.t('uploadComplete'), 'success');
            
        } catch (error) {
            console.error('Upload error:', error);
            
            // Show error
            this.uploadProgress.classList.add('hidden');
            this.uploadResult.classList.remove('hidden');
            this.uploadResult.classList.add('error');
            
            this.resultIcon.textContent = '❌';
            this.resultTitle.textContent = this.t('uploadFailed');
            this.resultStats.innerHTML = `<p style="color: #e53e3e;">${error.message}</p>`;
            
            this.showToast(this.t('networkError'), 'error');
        }
    }
    
    showToast(message, type = 'success') {
        // Remove existing toasts
        document.querySelectorAll('.toast-notification').forEach(t => t.remove());
        
        const toast = document.createElement('div');
        toast.className = `toast-notification ${type}`;
        toast.innerHTML = `
            <span style="font-size: 1.5rem;">${type === 'success' ? '✅' : '❌'}</span>
            <span>${message}</span>
        `;
        document.body.appendChild(toast);
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(100px)';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
}