// Configuration
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' 
    ? 'http://localhost:5000/api' 
    : '/api';

// State
let allQuestions = [];
let currentQuestions = [];
let currentQuestionIndex = 0;
let userAnswers = [];
let stats = { correct: 0, incorrect: 0, total: 0 };
let selectedCategory = 'all';

// DOM Elements
const elements = {
    welcomeScreen: document.getElementById('welcomeScreen'),
    quizScreen: document.getElementById('quizScreen'),
    resultsScreen: document.getElementById('resultsScreen'),
    
    questionText: document.getElementById('questionText'),
    questionCategory: document.getElementById('questionCategory'),
    optionsContainer: document.getElementById('optionsContainer'),
    checkAnswerBtn: document.getElementById('checkAnswerBtn'),
    nextQuestionBtn: document.getElementById('nextQuestionBtn'),
    prevQuestionBtn: document.getElementById('prevQuestionBtn'),
    finishQuizBtn: document.getElementById('finishQuizBtn'),
    resultContainer: document.getElementById('resultContainer'),
    
    progressFill: document.getElementById('progressFill'),
    currentQuestion: document.getElementById('currentQuestion'),
    totalQuestions: document.getElementById('totalQuestions'),
    
    correctCount: document.getElementById('correctCount'),
    incorrectCount: document.getElementById('incorrectCount'),
    percentScore: document.getElementById('percentScore'),
    
    finalScore: document.getElementById('finalScore'),
    finalCorrect: document.getElementById('finalCorrect'),
    finalIncorrect: document.getElementById('finalIncorrect'),
    finalTotal: document.getElementById('finalTotal'),
    resultsMessage: document.getElementById('resultsMessage'),
    
    backToMenuBtn: document.getElementById('backToMenuBtn'),
    backToMenuBtn2: document.getElementById('backToMenuBtn2'),
    restartQuizBtn: document.getElementById('restartQuizBtn'),
    
    statsBtn: document.getElementById('statsBtn'),
    statsModal: document.getElementById('statsModal'),
    closeStatsModal: document.getElementById('closeStatsModal'),
    statsContent: document.getElementById('statsContent'),
    
    loadingSpinner: document.getElementById('loadingSpinner')
};

// Category mapping
const categoryNames = {
    'cloud_basics': '☁️ Основы облаков',
    'aws': '🚀 AWS Сервисы',
    'docker': '🐳 Docker'
};

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

function showScreen(screen) {
    elements.welcomeScreen.classList.add('hidden');
    elements.quizScreen.classList.add('hidden');
    elements.resultsScreen.classList.add('hidden');
    
    if (screen === 'welcome') elements.welcomeScreen.classList.remove('hidden');
    else if (screen === 'quiz') elements.quizScreen.classList.remove('hidden');
    else if (screen === 'results') elements.resultsScreen.classList.remove('hidden');
}

async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast('Ошибка подключения к серверу', 'error');
        throw error;
    }
}

// Load Questions
async function loadQuestions() {
    try {
        showLoading();
        const data = await apiCall('/academo/questions');
        allQuestions = data.questions;
        
        // Update category counts
        const categoryCounts = {};
        allQuestions.forEach(q => {
            categoryCounts[q.category] = (categoryCounts[q.category] || 0) + 1;
        });
        
        document.getElementById('count-all').textContent = allQuestions.length;
        Object.keys(categoryCounts).forEach(cat => {
            const el = document.getElementById(`count-${cat}`);
            if (el) el.textContent = categoryCounts[cat];
        });
        
        console.log('Loaded questions:', allQuestions.length);
    } catch (error) {
        showToast('Не удалось загрузить вопросы', 'error');
    } finally {
        hideLoading();
    }
}

// Category Selection
document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        selectedCategory = btn.dataset.category;
        startQuiz(selectedCategory);
    });
});

// Start Quiz
function startQuiz(category) {
    // Filter questions by category
    if (category === 'all') {
        currentQuestions = [...allQuestions];
    } else {
        currentQuestions = allQuestions.filter(q => q.category === category);
    }
    
    if (currentQuestions.length === 0) {
        showToast('Нет вопросов в этой категории', 'error');
        return;
    }
    
    // Shuffle questions
    currentQuestions = shuffleArray(currentQuestions);
    
    // Reset state
    currentQuestionIndex = 0;
    userAnswers = new Array(currentQuestions.length).fill(null);
    stats = { correct: 0, incorrect: 0, total: 0 };
    
    // Update UI
    elements.totalQuestions.textContent = currentQuestions.length;
    updateScoreDisplay();
    
    // Show quiz
    showScreen('quiz');
    loadQuestion();
}

function shuffleArray(array) {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// Load Question
function loadQuestion() {
    const question = currentQuestions[currentQuestionIndex];
    const answered = userAnswers[currentQuestionIndex] !== null;
    
    // Update progress
    const progress = ((currentQuestionIndex) / currentQuestions.length) * 100;
    elements.progressFill.style.width = `${progress}%`;
    elements.currentQuestion.textContent = currentQuestionIndex + 1;
    
    // Update category badge
    elements.questionCategory.textContent = categoryNames[question.category] || question.category;
    
    // Update question text
    elements.questionText.textContent = question.question;
    
    // Render options
    elements.optionsContainer.innerHTML = '';
    question.options.forEach((option, index) => {
        const optionEl = document.createElement('div');
        optionEl.className = 'option';
        optionEl.textContent = option;
        optionEl.dataset.option = option;
        
        // If already answered, show result
        if (answered) {
            optionEl.classList.add('disabled');
            const userAnswer = userAnswers[currentQuestionIndex];
            if (option === question.correct) {
                optionEl.classList.add('correct');
            } else if (option === userAnswer.answer) {
                optionEl.classList.add('incorrect');
            }
        } else {
            optionEl.addEventListener('click', () => selectOption(optionEl, option));
        }
        
        elements.optionsContainer.appendChild(optionEl);
    });
    
    // Update buttons
    if (answered) {
        elements.checkAnswerBtn.classList.add('hidden');
        elements.nextQuestionBtn.classList.remove('hidden');
        showResult(userAnswers[currentQuestionIndex]);
    } else {
        elements.checkAnswerBtn.classList.remove('hidden');
        elements.checkAnswerBtn.disabled = true;
        elements.nextQuestionBtn.classList.add('hidden');
        elements.resultContainer.classList.add('hidden');
    }
    
    // Navigation buttons
    elements.prevQuestionBtn.disabled = currentQuestionIndex === 0;
    
    // Show finish button on last question
    if (currentQuestionIndex === currentQuestions.length - 1) {
        elements.finishQuizBtn.classList.remove('hidden');
    } else {
        elements.finishQuizBtn.classList.add('hidden');
    }
}

// Select Option
let selectedOption = null;

function selectOption(optionEl, option) {
    // Remove previous selection
    document.querySelectorAll('.option').forEach(opt => opt.classList.remove('selected'));
    
    // Select new option
    optionEl.classList.add('selected');
    selectedOption = option;
    elements.checkAnswerBtn.disabled = false;
}

// Check Answer
elements.checkAnswerBtn.addEventListener('click', async () => {
    if (!selectedOption) return;
    
    try {
        showLoading();
        const question = currentQuestions[currentQuestionIndex];
        
        const result = await apiCall('/academo/check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                questionId: question.id,
                answer: selectedOption
            })
        });
        
        // Save answer
        userAnswers[currentQuestionIndex] = {
            answer: selectedOption,
            correct: result.correct,
            correctAnswer: result.correctAnswer,
            explanation: result.explanation
        };
        
        // Update stats
        if (result.correct) {
            stats.correct++;
        } else {
            stats.incorrect++;
        }
        stats.total++;
        
        updateScoreDisplay();
        
        // Show result
        showResult(userAnswers[currentQuestionIndex]);
        
        // Update UI
        elements.checkAnswerBtn.classList.add('hidden');
        elements.nextQuestionBtn.classList.remove('hidden');
        
        // Highlight options
        document.querySelectorAll('.option').forEach(opt => {
            opt.classList.add('disabled');
            if (opt.dataset.option === result.correctAnswer) {
                opt.classList.add('correct');
            } else if (opt.dataset.option === selectedOption) {
                opt.classList.add('incorrect');
            }
        });
        
    } catch (error) {
        showToast('Не удалось проверить ответ', 'error');
    } finally {
        hideLoading();
    }
});

function showResult(answerData) {
    const isCorrect = answerData.correct;
    
    elements.resultContainer.className = `result-container ${isCorrect ? 'result-correct' : 'result-incorrect'}`;
    elements.resultContainer.innerHTML = `
        <h4>${isCorrect ? '✅ Правильно!' : '❌ Неправильно'}</h4>
        <p><strong>Правильный ответ:</strong> ${answerData.correctAnswer}</p>
        <p>${answerData.explanation}</p>
    `;
    elements.resultContainer.classList.remove('hidden');
}

function updateScoreDisplay() {
    elements.correctCount.textContent = stats.correct;
    elements.incorrectCount.textContent = stats.incorrect;
    
    const percent = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;
    elements.percentScore.textContent = `${percent}%`;
}

// Navigation
elements.nextQuestionBtn.addEventListener('click', () => {
    if (currentQuestionIndex < currentQuestions.length - 1) {
        currentQuestionIndex++;
        selectedOption = null;
        loadQuestion();
    }
});

elements.prevQuestionBtn.addEventListener('click', () => {
    if (currentQuestionIndex > 0) {
        currentQuestionIndex--;
        selectedOption = null;
        loadQuestion();
    }
});

elements.finishQuizBtn.addEventListener('click', () => {
    showResults();
});

elements.backToMenuBtn.addEventListener('click', () => {
    if (confirm('Вы уверены? Прогресс теста будет потерян.')) {
        showScreen('welcome');
    }
});

elements.backToMenuBtn2.addEventListener('click', () => {
    showScreen('welcome');
});

elements.restartQuizBtn.addEventListener('click', () => {
    startQuiz(selectedCategory);
});

// Show Results
function showResults() {
    const percent = Math.round((stats.correct / stats.total) * 100);
    
    elements.finalScore.textContent = `${percent}%`;
    elements.finalCorrect.textContent = stats.correct;
    elements.finalIncorrect.textContent = stats.incorrect;
    elements.finalTotal.textContent = stats.total;
    
    // Message based on score
    let message = '';
    let messageClass = '';
    
    if (percent >= 90) {
        message = '🌟 Отлично! Вы прекрасно знаете материал!';
        messageClass = 'excellent';
    } else if (percent >= 70) {
        message = '👍 Хорошо! Но есть куда расти.';
        messageClass = 'good';
    } else {
        message = '📚 Нужно повторить материал.';
        messageClass = 'needWork';
    }
    
    elements.resultsMessage.textContent = message;
    elements.resultsMessage.className = `results-message ${messageClass}`;
    
    showScreen('results');
}

// Stats
elements.statsBtn.addEventListener('click', async () => {
    try {
        showLoading();
        const data = await apiCall('/academo/stats');
        
        let html = `
            <div class="stat-card">
                <div class="stat-value">${data.totalQuestions}</div>
                <div class="stat-label">Всего вопросов</div>
            </div>
        `;
        
        Object.entries(data.categories).forEach(([cat, count]) => {
            const name = categoryNames[cat] || cat;
            html += `
                <div class="stat-card">
                    <div class="stat-value">${count}</div>
                    <div class="stat-label">${name}</div>
                </div>
            `;
        });
        
        elements.statsContent.innerHTML = html;
        elements.statsModal.classList.remove('hidden');
    } catch (error) {
        showToast('Не удалось загрузить статистику', 'error');
    } finally {
        hideLoading();
    }
});

elements.closeStatsModal.addEventListener('click', () => {
    elements.statsModal.classList.add('hidden');
});

// Close modal on background click
elements.statsModal.addEventListener('click', (e) => {
    if (e.target === elements.statsModal) {
        elements.statsModal.classList.add('hidden');
    }
});

// Initialize
console.log('Academo Quiz initialized 📚');
loadQuestions();