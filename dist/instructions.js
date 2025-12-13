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
        this.replayBtn.addEventListener('click', () => this.replay());
        this.pauseBtn.addEventListener('click', () => this.togglePause());
        
        // Language toggle
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.changeLanguage(e.target.dataset.lang));
        });
        
        // CTA button
        document.getElementById('uploadCTA').addEventListener('click', () => {
            // Redirect to main page or open upload modal
            window.parent?.postMessage({ action: 'openUpload' }, '*');
            // Or redirect
            // window.location.href = '/';
        });
        
        // Start animation
        this.startAnimation();
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
});

// Handle resize
let animator = null;
window.addEventListener('resize', () => {
    if (window.innerWidth > 768 && !animator) {
        animator = new InstructionsAnimator();
    }
});