// Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api';

// Загружаем сохранённый язык из localStorage
let currentLang = localStorage.getItem('awsQuizLang') || 'en';
let currentQuestion = null;
let quizMode = false;
let currentAnswers = [];
let quizStats = { correct: 0, total: 0 };
let currentPage = 1;
let perPage = 12;
let aiResultCache = null;
let questionAnswered = false;

// Translations
const translations = {
    en: {
        welcomeTitle: 'Welcome to AWS Quiz! 🚀',
        welcomeSubtitle: 'Test your AWS Cloud Practitioner knowledge',
        startQuiz: 'Start Quiz',
        browseQuestions: 'Browse Questions',
        questionCounter: 'Question',
        score: 'Score',
        checkAnswer: 'Check Answer',
        nextQuestion: 'Next Question',
        showHints: 'Show Hints',
        hideHints: 'Hide Hints',
        aiHelper: 'AI Study Helper',
        keyConcepts: 'Key Concepts',
        thinkAbout: 'Think About',
        relatedTopics: 'Related Topics',
        hintWarning: 'These are hints, not answers. Try to solve it yourself first!',
        correct: 'Correct!',
        incorrect: 'Incorrect',
        correctAnswer: 'Correct answer',
        correctAnswers: 'Correct answers',
        uploadJson: 'Upload Telegram JSON',
        statistics: 'Statistics',
        totalQuestions: 'Total Questions',
        aiVerified: 'AI Verified',
        translationsCount: 'Translations',
        coverage: 'Coverage',
        searchPlaceholder: 'Search questions...',
        noQuestions: 'No questions found',
        perPage: 'per page',
        prev: 'Prev',
        next: 'Next',
        networkError: 'Network error. Please try again.',
        uploadSuccess: 'Questions uploaded successfully!',
        uploadFailed: 'Upload failed. Please check the file format.',
        loadingHints: 'Loading hints...',
        hintsError: 'Failed to load hints. Please try again.',
        languageChanged: 'Language',
        selectAnswers: 'You can only select',
        answers: 'answers'
    },
    ru: {
        welcomeTitle: 'Добро пожаловать в AWS Quiz! 🚀',
        welcomeSubtitle: 'Проверьте свои знания AWS Cloud Practitioner',
        startQuiz: 'Начать тест',
        browseQuestions: 'Просмотр вопросов',
        questionCounter: 'Вопрос',
        score: 'Счёт',
        checkAnswer: 'Проверить ответ',
        nextQuestion: 'Следующий вопрос',
        showHints: 'Показать подсказки',
        hideHints: 'Скрыть подсказки',
        aiHelper: 'AI Помощник',
        keyConcepts: 'Ключевые концепции',
        thinkAbout: 'Подумайте о',
        relatedTopics: 'Связанные темы',
        hintWarning: 'Это подсказки, а не ответы. Попробуйте решить самостоятельно!',
        correct: 'Правильно!',
        incorrect: 'Неправильно',
        correctAnswer: 'Правильный ответ',
        correctAnswers: 'Правильные ответы',
        uploadJson: 'Загрузить Telegram JSON',
        statistics: 'Статистика',
        totalQuestions: 'Всего вопросов',
        aiVerified: 'Проверено AI',
        translationsCount: 'Переводов',
        coverage: 'Покрытие',
        searchPlaceholder: 'Поиск вопросов...',
        noQuestions: 'Вопросы не найдены',
        perPage: 'на странице',
        prev: 'Назад',
        next: 'Вперёд',
        networkError: 'Ошибка сети. Попробуйте снова.',
        uploadSuccess: 'Вопросы успешно загружены!',
        uploadFailed: 'Загрузка не удалась. Проверьте формат файла.',
        loadingHints: 'Загрузка подсказок...',
        hintsError: 'Не удалось загрузить подсказки. Попробуйте снова.',
        languageChanged: 'Язык',
        selectAnswers: 'Вы можете выбрать только',
        answers: 'ответов'
    }
};

function t(key) {
    return translations[currentLang][key] || key;
}

// DOM Elements
const elements = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    quizScreen: document.getElementById('quizScreen'),
    browseScreen: document.getElementById('browseScreen'),

    questionText: document.getElementById('questionText'),
    questionNumber: document.getElementById('questionNumber'),
    optionsContainer: document.getElementById('optionsContainer'),
    checkAnswerBtn: document.getElementById('checkAnswerBtn'),
    nextQuestionBtn: document.getElementById('nextQuestionBtn'),
    resultContainer: document.getElementById('resultContainer'),
    questionCounter: document.getElementById('questionCounter'),
    score: document.getElementById('score'),
    langToggle: document.getElementById('langToggle'),
    instructionsBtn: document.getElementById('instructionsBtn'),
    statsBtn: document.getElementById('statsBtn'),
    uploadModal: document.getElementById('uploadModal'),
    statsModal: document.getElementById('statsModal'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    searchInput: document.getElementById('searchInput'),
    perPageSelect: document.getElementById('perPageSelect'),
    questionsList: document.getElementById('questionsList'),
    pagination: document.getElementById('pagination'),
    aiHintsContainer: document.getElementById('aiHintsContainer'),
    aiHintsContent: document.getElementById('aiHintsContent'),
    toggleHintsBtn: document.getElementById('toggleHintsBtn'),
    welcomeTitle: document.getElementById('welcomeTitle'),
    welcomeSubtitle: document.getElementById('welcomeSubtitle'),
    startQuizBtn: document.getElementById('startQuizBtn'),
    browseQuestionsBtn: document.getElementById('browseQuestionsBtn'),
    hintsHeader: document.getElementById('hintsHeader')
};

// Event Listeners
elements.startQuizBtn.addEventListener('click', startQuiz);
elements.browseQuestionsBtn.addEventListener('click', showBrowse);
// Instructions now opens separate page via <a> link
elements.langToggle.addEventListener('click', toggleLanguage);
elements.statsBtn.addEventListener('click', loadStats);
elements.checkAnswerBtn.addEventListener('click', checkAnswer);
elements.nextQuestionBtn.addEventListener('click', loadRandomQuestion);
elements.toggleHintsBtn.addEventListener('click', toggleAIHints);
document.getElementById('closeUploadModal').addEventListener('click', () => hideModal('uploadModal'));
document.getElementById('closeStatsModal').addEventListener('click', () => hideModal('statsModal'));
elements.searchInput.addEventListener('input', debounce(() => { currentPage = 1; loadQuestions(); }, 500));
elements.perPageSelect.addEventListener('change', (e) => { perPage = parseInt(e.target.value); currentPage = 1; loadQuestions(); });

// Upload button - now on separate instructions page

// File Upload
const uploadArea = document.getElementById('uploadArea');
const fileInput = document.getElementById('fileInput');

uploadArea.addEventListener('click', () => fileInput.click());
uploadArea.addEventListener('dragover', (e) => {
    e.preventDefault();
    uploadArea.classList.add('dragover');
});
uploadArea.addEventListener('dragleave', () => uploadArea.classList.remove('dragover'));
uploadArea.addEventListener('drop', (e) => {
    e.preventDefault();
    uploadArea.classList.remove('dragover');
    if (e.dataTransfer.files.length) handleFileUpload(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length) handleFileUpload(e.target.files[0]);
});

// Utility Functions
function showLoading() {
    elements.loadingSpinner.classList.remove('hidden');
}

function hideLoading() {
    elements.loadingSpinner.classList.add('hidden');
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.getElementById('toastContainer').appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function showModal(modalId) {
    document.getElementById(modalId).classList.remove('hidden');
}

function hideModal(modalId) {
    document.getElementById(modalId).classList.add('hidden');
}

function debounce(func, wait) {
    let timeout;
    return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast(t('networkError'), 'error');
        throw error;
    }
}

// Update UI Language
function updateUILanguage() {
    // Welcome screen
    if (elements.welcomeTitle) elements.welcomeTitle.textContent = t('welcomeTitle');
    if (elements.welcomeSubtitle) elements.welcomeSubtitle.textContent = t('welcomeSubtitle');
    if (elements.startQuizBtn) elements.startQuizBtn.textContent = t('startQuiz');
    if (elements.browseQuestionsBtn) elements.browseQuestionsBtn.textContent = t('browseQuestions');
    
    // Quiz buttons
    if (elements.checkAnswerBtn) elements.checkAnswerBtn.textContent = t('checkAnswer');
    if (elements.nextQuestionBtn) elements.nextQuestionBtn.textContent = t('nextQuestion');
    if (elements.toggleHintsBtn) {
        elements.toggleHintsBtn.textContent = elements.aiHintsContainer.classList.contains('hidden') 
            ? `💡 ${t('showHints')}` 
            : `💡 ${t('hideHints')}`;
    }
    
    // Hints header
    if (elements.hintsHeader) elements.hintsHeader.textContent = `🤖 ${t('aiHelper')}`;
    
    // Header buttons
    if (elements.instructionsBtn) elements.instructionsBtn.textContent = `📖 ${currentLang === 'en' ? 'Instructions' : 'Инструкция'}`;
    if (elements.statsBtn) elements.statsBtn.textContent = `📊 ${t('statistics')}`;
    
    // Search placeholder
    if (elements.searchInput) elements.searchInput.placeholder = `🔍 ${t('searchPlaceholder')}`;
    
    // Score
    if (quizMode && elements.score) {
        elements.score.textContent = `${t('score')}: ${quizStats.correct}/${quizStats.total}`;
    }
}

// Language Toggle
async function toggleLanguage() {
    const oldLang = currentLang;
    currentLang = currentLang === 'en' ? 'ru' : 'en';
    
    // Сохраняем язык в localStorage
    localStorage.setItem('awsQuizLang', currentLang);
    
    elements.langToggle.textContent = currentLang === 'en' ? '🌐 RU' : '🌐 EN';
    
    // Update all UI text
    updateUILanguage();
    
    // If in quiz mode with a question
    if (quizMode && currentQuestion) {
        try {
            showLoading();
            
            // Показываем сообщение если переводим на русский
            if (currentLang === 'ru') {
                // Создаём специальное уведомление с анимацией
                const translatingToast = document.createElement('div');
                translatingToast.className = 'toast info translating-toast';
                translatingToast.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <div style="width: 20px; height: 20px; border: 3px solid #e2e8f0; border-top-color: #4299e1; border-radius: 50%; animation: spin 0.8s linear infinite;"></div>
                        <span>Переводим через AI<span class="hint-loading-dots"></span></span>
                    </div>
                `;
                document.getElementById('toastContainer').appendChild(translatingToast);
                
                // Загружаем вопрос на новом языке
                const questionData = await reloadCurrentQuestion();
                
                // Убираем уведомление о переводе
                translatingToast.remove();
                
                if (questionData) {
                    currentQuestion = questionData;
                    loadQuestionData(questionData, true);
                    
                    // Update AI result if shown
                    if (questionAnswered && aiResultCache && !elements.resultContainer.classList.contains('hidden')) {
                        await reloadAIResult();
                    }
                    
                    // Update hints if shown
                    if (!elements.aiHintsContainer.classList.contains('hidden')) {
                        await loadAIHints();
                    }
                    
                    hideLoading();
                    showToast('✅ Перевод готов!', 'success');
                } else {
                    hideLoading();
                    currentLang = oldLang;
                    elements.langToggle.textContent = currentLang === 'en' ? '🌐 RU' : '🌐 EN';
                    updateUILanguage();
                    showToast('Не удалось переключить язык', 'error');
                }
            } else {
                // Переключение на английский
                const questionData = await reloadCurrentQuestion();
                
                if (questionData) {
                    currentQuestion = questionData;
                    loadQuestionData(questionData, true);
                    
                    if (questionAnswered && aiResultCache && !elements.resultContainer.classList.contains('hidden')) {
                        await reloadAIResult();
                    }
                    
                    if (!elements.aiHintsContainer.classList.contains('hidden')) {
                        await loadAIHints();
                    }
                    
                    hideLoading();
                    showToast(`${t('languageChanged')}: EN`, 'success');
                } else {
                    hideLoading();
                    currentLang = oldLang;
                    elements.langToggle.textContent = currentLang === 'en' ? '🌐 RU' : '🌐 EN';
                    updateUILanguage();
                    showToast('Failed to switch language', 'error');
                }
            }
        } catch (error) {
            console.error('Language switch error:', error);
            hideLoading();
            currentLang = oldLang;
            elements.langToggle.textContent = currentLang === 'en' ? '🌐 RU' : '🌐 EN';
            updateUILanguage();
            showToast('Ошибка переключения языка', 'error');
        }
    } else if (!quizMode && elements.browseScreen && !elements.browseScreen.classList.contains('hidden')) {
        loadQuestions();
        showToast(`${t('languageChanged')}: ${currentLang.toUpperCase()}`, 'success');
    } else {
        showToast(`${t('languageChanged')}: ${currentLang.toUpperCase()}`, 'success');
    }
}

// Reload current question in new language
async function reloadCurrentQuestion() {
    if (!currentQuestion) {
        console.log('No current question');
        return null;
    }
    
    console.log(`Reloading question ${currentQuestion.id} in ${currentLang}`);
    
    try {
        // Если переключаемся на русский и у вопроса нет перевода
        if (currentLang === 'ru') {
            console.log('Loading Russian version...');
            
            // Сначала проверяем, есть ли уже перевод в БД
            const data = await apiCall(`/questions/paginated?page=1&per_page=100&search=&lang=ru`);
            const found = data.questions.find(q => q.id === currentQuestion.id);
            
            console.log('Found in DB:', found ? 'yes' : 'no', 'Has translation:', found?.hasTranslation);
            
            if (found && found.hasTranslation) {
                // Перевод есть в БД
                console.log('Using existing translation');
                return found;
            }
            
            // Перевода нет - делаем через AI
            console.log('Translating via AI...');
            try {
                const translated = await apiCall('/ai/translate-question', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ questionId: currentQuestion.id })
                });
                
                console.log('Translation received:', translated);
                
                // Возвращаем вопрос с переводом
                return {
                    ...currentQuestion,
                    question: translated.question,
                    options: translated.options,
                    hasTranslation: true
                };
            } catch (error) {
                console.error('Translation failed:', error);
                // Если перевод не удался, возвращаем оригинал
                return found || currentQuestion;
            }
        } else {
            // Переключаемся на английский - просто загружаем оригинал
            console.log('Loading English version...');
            const data = await apiCall(`/questions/paginated?page=1&per_page=100&search=&lang=en`);
            const found = data.questions.find(q => q.id === currentQuestion.id);
            console.log('Found English version:', found ? 'yes' : 'no');
            return found || currentQuestion;
        }
    } catch (error) {
        console.error('Failed to reload question:', error);
        return null;
    }
}

// Reload AI result in new language
async function reloadAIResult() {
    if (!aiResultCache || !questionAnswered) return;
    
    try {
        const data = await apiCall('/ai/check-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: currentQuestion.id,
                lang: currentLang
            })
        });
        
        aiResultCache = data;
        updateResultDisplay(data);
    } catch (error) {
        console.error('Failed to reload AI result:', error);
    }
}

// Screen Navigation
function showScreen(screen) {
    elements.welcomeScreen.classList.add('hidden');
    elements.quizScreen.classList.add('hidden');
    elements.browseScreen.classList.add('hidden');
    
    if (screen === 'welcome') elements.welcomeScreen.classList.remove('hidden');
    else if (screen === 'quiz') elements.quizScreen.classList.remove('hidden');
    else if (screen === 'browse') elements.browseScreen.classList.remove('hidden');
}

// Quiz Mode
async function startQuiz() {
    quizMode = true;
    quizStats = { correct: 0, total: 0 };
    showScreen('quiz');
    updateUILanguage();
    await loadRandomQuestion();
}

async function loadRandomQuestion() {
    try {
        showLoading();
        const data = await apiCall(`/questions/random?lang=${currentLang}`);
        currentQuestion = data;
        aiResultCache = null;
        questionAnswered = false;
        loadQuestionData(data);
        resetQuestionState();
        
        // Hide hints on new question
        elements.aiHintsContainer.classList.add('hidden');
        elements.toggleHintsBtn.textContent = `💡 ${t('showHints')}`;
    } catch (error) {
        showToast('Failed to load question', 'error');
    } finally {
        hideLoading();
    }
}

function loadQuestionData(data, keepAnswers = false) {
    elements.questionNumber.textContent = `#${data.number}`;
    
    // Показываем количество ответов для выбора если multiple choice
    let questionText = data.question;
    if (data.isMultipleChoice && data.selectCount > 1) {
        const selectLabel = currentLang === 'ru' 
            ? `(Выбери ${data.selectCount})` 
            : `(Select ${data.selectCount})`;
        // Добавляем подсказку если её ещё нет в тексте
        if (!questionText.toLowerCase().includes('select') && !questionText.includes('Выбери')) {
            questionText = `${questionText} ${selectLabel}`;
        }
    }
    elements.questionText.textContent = questionText;
    
    // Update counter
    elements.questionCounter.textContent = `${t('questionCounter')} ${data.number}`;
    elements.score.textContent = `${t('score')}: ${quizStats.correct}/${quizStats.total}`;
    
    // Render options - БЕЗ автовыбора!
    elements.optionsContainer.innerHTML = '';
    data.options.forEach((option, idx) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option';
        
        // Убираем "Your responses:" и другой мусор из текста опции
        let cleanOption = option
            .replace(/Your responses?:?\s*/gi, '')
            .replace(/\s*Your responses?:?\s*$/gi, '')
            .trim();
        
        optionEl.textContent = cleanOption;
        optionEl.dataset.index = idx;
        optionEl.dataset.letter = cleanOption.charAt(0);
        
        // Восстанавливаем выбор ТОЛЬКО если keepAnswers=true И вопрос уже был отвечен
        if (keepAnswers && questionAnswered && currentAnswers.includes(cleanOption.charAt(0))) {
            optionEl.classList.add('selected');
        }
        
        // Если уже показан результат, добавляем цвета
        if (questionAnswered && aiResultCache && !elements.resultContainer.classList.contains('hidden')) {
            optionEl.classList.add('disabled');
            const letter = cleanOption.charAt(0);
            if (aiResultCache.correctAnswers.includes(letter)) {
                optionEl.classList.add('correct');
            } else if (currentAnswers.includes(letter)) {
                optionEl.classList.add('incorrect');
            }
        } else if (!questionAnswered) {
            // Только если вопрос НЕ отвечен, добавляем обработчик клика
            optionEl.addEventListener('click', () => selectOption(optionEl, data.isMultipleChoice, data.selectCount));
        }
        
        elements.optionsContainer.appendChild(optionEl);
    });
    
    // Обновляем состояние кнопки проверки
    if (!keepAnswers) {
        currentAnswers = [];
        elements.checkAnswerBtn.disabled = true;
    } else {
        elements.checkAnswerBtn.disabled = currentAnswers.length === 0;
    }
}

function resetQuestionState() {
    elements.resultContainer.classList.add('hidden');
    elements.nextQuestionBtn.classList.add('hidden');
    elements.checkAnswerBtn.classList.remove('hidden');
    currentAnswers = [];
    aiResultCache = null;
    questionAnswered = false;
}

function selectOption(optionEl, isMultiple, selectCount) {
    if (optionEl.classList.contains('disabled')) return;
    
    const letter = optionEl.dataset.letter;
    
    if (isMultiple) {
        if (optionEl.classList.contains('selected')) {
            // Снимаем выбор
            optionEl.classList.remove('selected');
            currentAnswers = currentAnswers.filter(a => a !== letter);
        } else {
            // Проверяем лимит
            if (currentAnswers.length < selectCount) {
                optionEl.classList.add('selected');
                currentAnswers.push(letter);
            } else {
                // Показываем сообщение о лимите
                const msg = currentLang === 'ru' 
                    ? `Можно выбрать только ${selectCount} ответ(ов)` 
                    : `You can only select ${selectCount} answer(s)`;
                showToast(msg, 'warning');
                return;
            }
        }
        
        // Показываем сколько выбрано / сколько нужно
        const remaining = selectCount - currentAnswers.length;
        if (remaining > 0 && currentAnswers.length > 0) {
            const remainingMsg = currentLang === 'ru' 
                ? `Выбрано ${currentAnswers.length} из ${selectCount}` 
                : `Selected ${currentAnswers.length} of ${selectCount}`;
            // Обновляем подсказку в интерфейсе (не toast)
        }
    } else {
        // Single choice
        document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
        optionEl.classList.add('selected');
        currentAnswers = [letter];
    }
    
    // Кнопка Check Answer активна только когда выбрано нужное количество
    if (isMultiple) {
        elements.checkAnswerBtn.disabled = currentAnswers.length !== selectCount;
    } else {
        elements.checkAnswerBtn.disabled = currentAnswers.length === 0;
    }
}

async function checkAnswer() {
    if (currentAnswers.length === 0) return;
    
    try {
        showLoading();
        const data = await apiCall('/ai/check-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: currentQuestion.id,
                lang: currentLang
            })
        });
        
        aiResultCache = data;
        questionAnswered = true;
        displayResult(data);
    } catch (error) {
        showToast('Failed to check answer', 'error');
    } finally {
        hideLoading();
    }
}

function displayResult(data) {
    const correctAnswers = data.correctAnswers;
    const isCorrect = arraysEqual(currentAnswers.sort(), correctAnswers.sort());
    
    // Update stats
    quizStats.total++;
    if (isCorrect) quizStats.correct++;
    elements.score.textContent = `${t('score')}: ${quizStats.correct}/${quizStats.total}`;
    
    // Highlight options
    document.querySelectorAll('.option').forEach(opt => {
        opt.classList.add('disabled');
        const letter = opt.dataset.letter;
        
        if (correctAnswers.includes(letter)) {
            opt.classList.add('correct');
        } else if (currentAnswers.includes(letter)) {
            opt.classList.add('incorrect');
        }
    });
    
    updateResultDisplay(data);
    
    // Show next button
    elements.checkAnswerBtn.classList.add('hidden');
    elements.nextQuestionBtn.classList.remove('hidden');
}

function updateResultDisplay(data) {
    const correctAnswers = data.correctAnswers;
    const isCorrect = arraysEqual(currentAnswers.sort(), correctAnswers.sort());
    
    const answerLabel = correctAnswers.length > 1 ? t('correctAnswers') : t('correctAnswer');
    
    elements.resultContainer.className = `result-container ${isCorrect ? 'result-correct' : 'result-incorrect'}`;
    elements.resultContainer.innerHTML = `
        <h4>${isCorrect ? '✅ ' + t('correct') : '❌ ' + t('incorrect')}</h4>
        <p><strong>${answerLabel}:</strong> ${correctAnswers.join(', ')}</p>
        <p>${data.explanation}</p>
    `;
    elements.resultContainer.classList.remove('hidden');
}

function arraysEqual(a, b) {
    return a.length === b.length && a.every((val, idx) => val === b[idx]);
}

// AI Hints System
async function toggleAIHints() {
    if (elements.aiHintsContainer.classList.contains('hidden')) {
        await loadAIHints();
        elements.aiHintsContainer.classList.remove('hidden');
        elements.toggleHintsBtn.textContent = `💡 ${t('hideHints')}`;
    } else {
        elements.aiHintsContainer.classList.add('hidden');
        elements.toggleHintsBtn.textContent = `💡 ${t('showHints')}`;
    }
}

async function loadAIHints() {
    if (!currentQuestion) return;
    
    try {
        // Показываем красивую загрузку
        elements.aiHintsContent.innerHTML = `
            <div class="hint-loading">
                <div class="hint-loading-spinner"></div>
                <div class="hint-loading-text">
                    ${currentLang === 'ru' ? 'Загружаем подсказки от AI' : 'Loading AI hints'}<span class="hint-loading-dots"></span>
                </div>
            </div>
        `;
        
        const data = await apiCall('/ai/check-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: currentQuestion.id,
                lang: currentLang
            })
        });
        
        // Если русский язык и нет перевода объяснения, показываем английский
        // API уже должен вернуть правильный язык
        const hints = generateHintsFromExplanation(data.explanation, data.correctAnswers);
        
        elements.aiHintsContent.innerHTML = `
            <div class="hint-section">
                <h4>🎯 ${t('keyConcepts')}</h4>
                <p class="hint-text">${hints.concepts}</p>
            </div>
            
            <div class="hint-section">
                <h4>💭 ${t('thinkAbout')}</h4>
                <p class="hint-text">${hints.thinkAbout}</p>
            </div>
            
            <div class="hint-section">
                <h4>📚 ${t('relatedTopics')}</h4>
                <p class="hint-text">${hints.relatedTopics}</p>
            </div>
            
            <div class="hint-warning">
                <small>⚠️ ${t('hintWarning')}</small>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load hints:', error);
        elements.aiHintsContent.innerHTML = `<p class="hint-error">${t('hintsError')}</p>`;
    }
}

function generateHintsFromExplanation(explanation, correctAnswers) {
    const sentences = explanation.split(/[.!?]+/).filter(s => s.trim());
    
    const concepts = sentences[0]?.trim() || 'This question tests your AWS knowledge.';
    const thinkAbout = sentences.slice(1, 3).join('. ').trim() || 'Consider the AWS best practices and service characteristics.';
    
    const awsServices = explanation.match(/AWS [A-Z][a-z]+(?:\s[A-Z][a-z]+)*/g) || [];
    const uniqueServices = [...new Set(awsServices)];
    const relatedTopics = uniqueServices.length > 0 
        ? `Related AWS services: ${uniqueServices.join(', ')}`
        : 'Review AWS core services and their use cases.';
    
    return { concepts, thinkAbout, relatedTopics };
}

// Browse Mode
function showBrowse() {
    quizMode = false;
    showScreen('browse');
    updateUILanguage();
    loadQuestions();
}

// Instructions Screen - now on separate page (instructions.html)

async function loadQuestions() {
    try {
        showLoading();
        const search = elements.searchInput.value;
        const data = await apiCall(`/questions/paginated?page=${currentPage}&per_page=${perPage}&search=${search}&lang=${currentLang}`);
        
        displayQuestions(data.questions);
        displayPagination(data);
    } catch (error) {
        showToast('Failed to load questions', 'error');
    } finally {
        hideLoading();
    }
}

function displayQuestions(questions) {
    elements.questionsList.innerHTML = '';
    
    if (questions.length === 0) {
        elements.questionsList.innerHTML = `<p style="text-align: center; color: #718096;">${t('noQuestions')}</p>`;
        return;
    }
    
    questions.forEach(q => {
        const item = document.createElement('div');
        item.className = 'question-item';
        item.innerHTML = `
            <div class="question-item-number">${t('questionCounter')} #${q.number}</div>
            <div class="question-item-text">${q.question}</div>
            ${q.isMultipleChoice ? `<span class="question-item-badge">${t('selectAnswers')} ${q.selectCount}</span>` : ''}
        `;
        item.addEventListener('click', () => viewQuestion(q));
        elements.questionsList.appendChild(item);
    });
}

function displayPagination(data) {
    elements.pagination.innerHTML = '';
    
    if (data.pages <= 1) return;
    
    const prevBtn = document.createElement('button');
    prevBtn.textContent = `← ${t('prev')}`;
    prevBtn.disabled = !data.hasPrev;
    prevBtn.addEventListener('click', () => { currentPage--; loadQuestions(); });
    elements.pagination.appendChild(prevBtn);
    
    const startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(data.pages, currentPage + 2);
    
    for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement('button');
        pageBtn.textContent = i;
        pageBtn.className = i === currentPage ? 'active' : '';
        pageBtn.addEventListener('click', () => { currentPage = i; loadQuestions(); });
        elements.pagination.appendChild(pageBtn);
    }
    
    const nextBtn = document.createElement('button');
    nextBtn.textContent = `${t('next')} →`;
    nextBtn.disabled = !data.hasNext;
    nextBtn.addEventListener('click', () => { currentPage++; loadQuestions(); });
    elements.pagination.appendChild(nextBtn);
}

function viewQuestion(question) {
    currentQuestion = question;
    quizMode = true;
    showScreen('quiz');
    updateUILanguage();
    loadQuestionData(question);
    resetQuestionState();
}

// File Upload
async function handleFileUpload(file) {
    if (!file.name.endsWith('.json')) {
        showToast('Please upload a JSON file', 'error');
        return;
    }
    
    try {
        showLoading();
        const text = await file.text();
        const json = JSON.parse(text);
        
        const result = await apiCall('/questions/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(json)
        });
        
        document.getElementById('uploadResult').innerHTML = `
            <h4>✅ Upload Successful!</h4>
            <p>New questions: ${result.new}</p>
            <p>Duplicates: ${result.duplicates}</p>
            <p>Total in database: ${result.total}</p>
        `;
        document.getElementById('uploadResult').classList.remove('hidden');
        
        showToast(t('uploadSuccess'), 'success');
    } catch (error) {
        showToast(t('uploadFailed'), 'error');
    } finally {
        hideLoading();
    }
}

// Stats
async function loadStats() {
    try {
        showLoading();
        const data = await apiCall('/stats');
        
        document.getElementById('statsContent').innerHTML = `
            <div class="stat-card">
                <div class="stat-value">${data.totalQuestions}</div>
                <div class="stat-label">${t('totalQuestions')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.cachedAnswers}</div>
                <div class="stat-label">${t('aiVerified')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.translationsCount}</div>
                <div class="stat-label">${t('translationsCount')}</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${data.coverage}%</div>
                <div class="stat-label">${t('coverage')}</div>
            </div>
        `;
        
        showModal('statsModal');
    } catch (error) {
        showToast('Failed to load stats', 'error');
    } finally {
        hideLoading();
    }
}

// Initialize
console.log('AWS Quiz App initialized ☁️');
console.log('API Base:', API_BASE);

// Устанавливаем правильный текст кнопки языка при загрузке
elements.langToggle.textContent = currentLang === 'en' ? '🌐 RU' : '🌐 EN';

updateUILanguage();