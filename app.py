from flask import Flask, request, jsonify, send_from_directory, redirect, make_response
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy.dialects.postgresql import ARRAY
from sqlalchemy import text
from sqlalchemy.exc import IntegrityError
import os
from datetime import datetime
import hashlib
import requests
from dotenv import load_dotenv
import threading
from functools import wraps
import time
from collections import defaultdict
import logging

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load .env file
load_dotenv()

# Flask app setup
app = Flask(__name__, static_folder='dist', static_url_path='')

# Secret key for sessions
app.secret_key = os.getenv('SECRET_KEY', 'your-secret-key-change-in-production')

# CORS
CORS(app, resources={r"/api/*": {"origins": "*"}})

# ============================================
# IP WHITELIST CONFIGURATION
# ============================================
# Admin password for managing IPs (set in Railway Variables)
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin123')

# Initial whitelist from environment (comma-separated)
# Example: ALLOWED_IPS=123.45.67.89,98.76.54.32
INITIAL_IPS = os.getenv('ALLOWED_IPS', '').split(',') if os.getenv('ALLOWED_IPS') else []

# In-memory whitelist (will be synced with DB)
allowed_ips = set(ip.strip() for ip in INITIAL_IPS if ip.strip())

# Always allow these
ALWAYS_ALLOWED = {'127.0.0.1', 'localhost'}

# Paths that don't require IP check
PUBLIC_PATHS = {'/api/health', '/blocked', '/admin/login', '/admin/auth'}

# Add these imports at the top of app.py
import json
import random

# Add this function to load questions from JSON
def load_academo_questions():
    """Load Academo questions from JSON file"""
    json_path = os.path.join(app.static_folder, 'academo_questions.json')
    try:
        with open(json_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            return data['questions']
    except FileNotFoundError:
        logger.error(f"Academo questions file not found: {json_path}")
        return []
    except json.JSONDecodeError as e:
        logger.error(f"Error parsing academo_questions.json: {e}")
        return []

# Load questions at startup
ACADEMO_QUESTIONS = load_academo_questions()
logger.info(f"Loaded {len(ACADEMO_QUESTIONS)} Academo questions")

# Add these routes (replace the old ones if they exist)

@app.route('/api/academo/questions', methods=['GET'])
def get_academo_questions():
    """Get all Academo questions or filtered by category"""
    category = request.args.get('category', None)
    
    questions = ACADEMO_QUESTIONS.copy()
    
    if category and category != 'all':
        questions = [q for q in questions if q['category'] == category]
    
    # Shuffle questions for randomness
    random.shuffle(questions)
    
    # Shuffle options for each question
    result = []
    for q in questions:
        q_copy = q.copy()
        options = q_copy['options'].copy()
        random.shuffle(options)
        q_copy['options'] = options
        result.append(q_copy)
    
    # Get category counts
    categories = {}
    for q in ACADEMO_QUESTIONS:
        cat = q['category']
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
    
    return jsonify({
        'questions': result,
        'total': len(result),
        'categories': categories
    })

@app.route('/api/academo/check', methods=['POST'])
def check_academo_answer():
    """Check answer for Academo question - supports single and multi-select"""
    data = request.get_json()
    question_id = data.get('questionId')
    user_answer = data.get('answer')
    is_multi_select = data.get('isMultiSelect', False)
    
    if not question_id or user_answer is None:
        return jsonify({'error': 'Missing questionId or answer'}), 400
    
    question = next((q for q in ACADEMO_QUESTIONS if q['id'] == question_id), None)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    correct_answer = question['correct']
    
    # Handle multi-select questions
    if isinstance(correct_answer, list):
        # Multi-select: user_answer should be a list
        if isinstance(user_answer, list):
            # Sort both for comparison
            user_set = set(a.strip() if isinstance(a, str) else a for a in user_answer)
            correct_set = set(a.strip() if isinstance(a, str) else a for a in correct_answer)
            is_correct = user_set == correct_set
        else:
            is_correct = False
    else:
        # Single select
        if isinstance(user_answer, list):
            # If user sent array for single select, take first element
            is_correct = user_answer[0].strip() == correct_answer.strip() if user_answer else False
        else:
            is_correct = user_answer.strip() == correct_answer.strip()
    
    return jsonify({
        'correct': is_correct,
        'correctAnswer': correct_answer,
        'explanation': question['explanation']
    })

@app.route('/api/academo/stats', methods=['GET'])
def academo_stats():
    """Get Academo statistics"""
    categories = {}
    for q in ACADEMO_QUESTIONS:
        cat = q['category']
        if cat not in categories:
            categories[cat] = 0
        categories[cat] += 1
    
    return jsonify({
        'totalQuestions': len(ACADEMO_QUESTIONS),
        'categories': categories
    })

# Add route for serving academo.html (before the catch-all route)
@app.route('/academo.html')
def academo_page():
    """Serve Academo page"""
    return send_from_directory(app.static_folder, 'academo.html')

def get_client_ip():
    """Get real client IP behind proxy"""
    if request.headers.get('X-Forwarded-For'):
        return request.headers.get('X-Forwarded-For').split(',')[0].strip()
    return request.remote_addr or '127.0.0.1'

def is_ip_allowed(ip):
    """Check if IP is in whitelist"""
    if ip in ALWAYS_ALLOWED:
        return True
    if ip in allowed_ips:
        return True
    # Check DB for allowed IPs
    try:
        db_ip = AllowedIP.query.filter_by(ip_address=ip, is_active=True).first()
        if db_ip:
            allowed_ips.add(ip)  # Cache it
            return True
    except:
        pass
    return False

@app.before_request
def check_ip_whitelist():
    """Check if request IP is allowed"""
    # Skip for public paths
    if request.path in PUBLIC_PATHS or request.path.startswith('/admin'):
        return None
    
    client_ip = get_client_ip()
    
    # If no whitelist configured, allow all (for initial setup)
    try:
        has_any_ips = allowed_ips or AllowedIP.query.first()
    except:
        has_any_ips = bool(allowed_ips)
    
    if not has_any_ips:
        return None
    
    if not is_ip_allowed(client_ip):
        logger.warning(f"Blocked access from IP: {client_ip}")
        if request.path.startswith('/api/'):
            return jsonify({
                'error': 'Access denied',
                'message': 'Your IP is not authorized',
                'your_ip': client_ip
            }), 403
        # Redirect with IP in query params
        return redirect(f'/blocked?ip={client_ip}')
    
    return None
# ============================================
# DATABASE CONFIGURATION FOR RAILWAY
# ============================================
def get_database_url():
    """
    Get database URL with Railway support.
    Railway provides DATABASE_URL automatically when PostgreSQL is added.
    """
    # Try Railway's DATABASE_URL first
    database_url = os.getenv('DATABASE_URL')
    
    if database_url:
        # Fix for older postgres:// URLs (Railway uses postgresql://)
        if database_url.startswith('postgres://'):
            database_url = database_url.replace('postgres://', 'postgresql://', 1)
        logger.info("Using DATABASE_URL from environment")
        return database_url
    
    # Try constructing from individual Railway variables
    pg_user = os.getenv('PGUSER', 'postgres')
    pg_password = os.getenv('PGPASSWORD') or os.getenv('POSTGRES_PASSWORD')
    pg_host = os.getenv('PGHOST') or os.getenv('RAILWAY_PRIVATE_DOMAIN')
    pg_port = os.getenv('PGPORT', '5432')
    pg_database = os.getenv('PGDATABASE') or os.getenv('POSTGRES_DB', 'railway')
    
    if pg_password and pg_host:
        database_url = f"postgresql://{pg_user}:{pg_password}@{pg_host}:{pg_port}/{pg_database}"
        logger.info("Constructed DATABASE_URL from PG* variables")
        return database_url
    
    # Fallback to local development database
    logger.warning("No Railway database config found, using local database")
    return 'postgresql://postgres:Alikhancool20!@localhost:5432/aws_quiz_db'

# Set database URL
app.config['SQLALCHEMY_DATABASE_URI'] = get_database_url()
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

# Connection pool settings for production
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    'pool_size': 10,           # Number of connections to keep open
    'pool_recycle': 300,       # Recycle connections after 5 minutes
    'pool_pre_ping': True,     # Verify connections before using
    'max_overflow': 20,        # Allow up to 20 extra connections under load
    'pool_timeout': 30,        # Wait up to 30s for a connection
}

# OpenAI API Key from environment
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY') or os.getenv('OPENAI')

db = SQLAlchemy(app)

# ============================================
# RATE LIMITING & CONCURRENCY CONTROL
# ============================================
class RateLimiter:
    """Simple in-memory rate limiter"""
    def __init__(self, requests_per_minute=30):
        self.requests_per_minute = requests_per_minute
        self.requests = defaultdict(list)
        self.lock = threading.Lock()
    
    def is_allowed(self, key):
        """Check if request is allowed"""
        now = time.time()
        minute_ago = now - 60
        
        with self.lock:
            # Clean old requests
            self.requests[key] = [t for t in self.requests[key] if t > minute_ago]
            
            if len(self.requests[key]) >= self.requests_per_minute:
                return False
            
            self.requests[key].append(now)
            return True

# Global rate limiter for AI requests
ai_rate_limiter = RateLimiter(requests_per_minute=60)  # 60 AI calls per minute total

# Lock for preventing duplicate AI processing
processing_locks = defaultdict(threading.Lock)
processing_locks_lock = threading.Lock()

def get_processing_lock(question_id):
    """Get or create a lock for a specific question"""
    with processing_locks_lock:
        return processing_locks[question_id]

def rate_limit(f):
    """Decorator for rate limiting"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Get client identifier (IP or some unique key)
        client_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        if client_ip:
            client_ip = client_ip.split(',')[0].strip()  # Get first IP if multiple
        
        if not ai_rate_limiter.is_allowed(client_ip):
            return jsonify({
                'error': 'Rate limit exceeded. Please wait a moment.',
                'retryAfter': 60
            }), 429
        
        return f(*args, **kwargs)
    return decorated_function

# ============================================
# MODELS
# ============================================

# IP Whitelist Model
class AllowedIP(db.Model):
    __tablename__ = 'allowed_ips'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    ip_address = db.Column(db.String(45), unique=True, nullable=False)  # 45 for IPv6
    description = db.Column(db.String(255), nullable=True)  # "Hamza's home", "Office", etc.
    is_active = db.Column(db.Boolean, default=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_access = db.Column(db.DateTime, nullable=True)
    
    def to_dict(self):
        return {
            'id': self.id,
            'ip': self.ip_address,
            'description': self.description,
            'isActive': self.is_active,
            'createdAt': self.created_at.isoformat() if self.created_at else None,
            'lastAccess': self.last_access.isoformat() if self.last_access else None
        }

class Question(db.Model):
    __tablename__ = 'questions'
    
    id = db.Column(db.String(255), primary_key=True)
    number = db.Column(db.Integer, nullable=False)
    question = db.Column(db.Text, nullable=False)
    options = db.Column(ARRAY(db.Text), nullable=False)
    is_multiple_choice = db.Column(db.Boolean, default=False)
    select_count = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self, lang='en'):
        # Очищаем опции от мусора типа "Your responses:"
        def clean_option(opt):
            import re
            cleaned = re.sub(r'\s*Your responses?:?\s*$', '', opt, flags=re.IGNORECASE)
            cleaned = re.sub(r'Your responses?:?\s*', '', cleaned, flags=re.IGNORECASE)
            return cleaned.strip()
        
        cleaned_options = [clean_option(opt) for opt in self.options]
        
        data = {
            'id': self.id,
            'number': self.number,
            'question': self.question,
            'options': cleaned_options,
            'isMultipleChoice': self.is_multiple_choice,
            'selectCount': self.select_count,
            'aiVerified': None,
            'hasTranslation': False
        }
        
        if lang != 'en':
            translation = Translation.query.filter_by(
                question_id=self.id, 
                language=lang
            ).first()
            if translation:
                data['question'] = translation.question_text
                data['options'] = [clean_option(opt) for opt in translation.options]
                data['hasTranslation'] = True
        
        cache = db.session.get(AICache, self.id)
        if cache:
            data['aiVerified'] = cache.to_dict(lang)
        
        return data

class AICache(db.Model):
    __tablename__ = 'ai_cache'
    
    question_id = db.Column(db.String(255), primary_key=True)
    correct_answers = db.Column(ARRAY(db.String(10)), nullable=False)
    explanation = db.Column(db.Text, nullable=False)
    explanation_ru = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def to_dict(self, lang='en'):
        explanation = self.explanation
        if lang == 'ru' and self.explanation_ru:
            explanation = self.explanation_ru
        
        return {
            'correctAnswers': self.correct_answers,
            'explanation': explanation,
            'hasTranslation': lang == 'ru' and self.explanation_ru is not None
        }

class Translation(db.Model):
    __tablename__ = 'translations'
    
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    question_id = db.Column(db.String(255), db.ForeignKey('questions.id'), nullable=False)
    language = db.Column(db.String(10), nullable=False)
    question_text = db.Column(db.Text, nullable=False)
    options = db.Column(ARRAY(db.Text), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    __table_args__ = (
        db.UniqueConstraint('question_id', 'language', name='unique_question_language'),
    )

# ============================================
# OPENAI HELPERS WITH RETRY LOGIC
# ============================================
def call_openai(messages, temperature=0.3, max_retries=3):
    """Call OpenAI API with retry logic"""
    if not OPENAI_API_KEY:
        raise Exception('OpenAI API key not configured')
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            response = requests.post(
                'https://api.openai.com/v1/chat/completions',
                headers={
                    'Content-Type': 'application/json',
                    'Authorization': f'Bearer {OPENAI_API_KEY}'
                },
                json={
                    'model': 'gpt-4o-mini',
                    'messages': messages,
                    'temperature': temperature
                },
                timeout=30
            )
            
            if response.ok:
                return response.json()['choices'][0]['message']['content']
            
            # If rate limited, wait and retry
            if response.status_code == 429:
                retry_after = int(response.headers.get('Retry-After', 5))
                logger.warning(f"OpenAI rate limited, waiting {retry_after}s")
                time.sleep(retry_after)
                continue
            
            # Other errors
            last_error = Exception(f'OpenAI API error: {response.status_code} - {response.text}')
            
        except requests.exceptions.Timeout:
            last_error = Exception('OpenAI API timeout')
            logger.warning(f"OpenAI timeout, attempt {attempt + 1}/{max_retries}")
            time.sleep(2 ** attempt)  # Exponential backoff
            
        except Exception as e:
            last_error = e
            logger.error(f"OpenAI error: {e}")
            time.sleep(1)
    
    raise last_error

def translate_text(text, text_type='question'):
    """Translate text to Russian"""
    if text_type == 'explanation':
        system_prompt = 'You are a translator. Translate the following AWS technical explanation to Russian. Keep technical terms in English where appropriate. Respond with ONLY the translation.'
    else:
        system_prompt = 'You are a translator. Translate the following AWS exam question/options to Russian. Keep AWS service names in English. Respond with ONLY the translation.'
    
    return call_openai([
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': text}
    ])

def get_ai_answer(question_text, options, is_multiple, select_count):
    """Get AI answer for question"""
    if is_multiple:
        system_prompt = f'''You are an AWS Cloud Practitioner expert. Analyze the question and provide EXACTLY {select_count} correct answers.

IMPORTANT: 
1. You MUST select exactly {select_count} answers, no more, no less.
2. In your explanation, DO NOT directly state which options are correct (like "A is correct" or "Choose B and C")
3. Instead, explain the CONCEPTS and WHY certain characteristics matter for this scenario
4. Let the student figure out the answer based on understanding, not memorization

Respond in JSON format: {{"correctAnswers": ["A", "B"], "explanation": "conceptual explanation without revealing answers"}}'''
    else:
        system_prompt = '''You are an AWS Cloud Practitioner expert. Analyze the question and provide the ONE correct answer.

IMPORTANT: 
1. This is a SINGLE choice question. Select exactly ONE answer.
2. In your explanation, DO NOT directly state which option is correct (like "A is correct")
3. Instead, explain the KEY CONCEPTS and WHY certain characteristics are important
4. Guide the student to understand the reasoning, not just memorize the answer

Respond in JSON format: {"correctAnswers": ["A"], "explanation": "conceptual explanation without revealing the answer"}'''
    
    user_content = f"Question: {question_text}\n\nOptions:\n{chr(10).join(options)}\n\n"
    if is_multiple:
        user_content += f"Select EXACTLY {select_count} correct answers. Explain concepts without directly revealing which options to choose."
    else:
        user_content += "Select ONE answer. Explain the reasoning without directly stating which option is correct."
    
    response = call_openai([
        {'role': 'system', 'content': system_prompt},
        {'role': 'user', 'content': user_content}
    ])
    
    import json
    try:
        return json.loads(response)
    except:
        import re
        correct_match = re.search(r'correctAnswers["\s:]+\[([^\]]+)\]', response)
        explanation_match = re.search(r'explanation["\s:]+["\'](.*?)["\']', response, re.DOTALL)
        
        return {
            'correctAnswers': [a.strip().strip('"\'') for a in correct_match.group(1).split(',')] if correct_match else [],
            'explanation': explanation_match.group(1) if explanation_match else response
        }

# ============================================
# HELPER FUNCTIONS
# ============================================
def generate_question_id(number, question_text):
    content = f"{number}_{question_text[:100]}"
    return hashlib.md5(content.encode()).hexdigest()

def parse_telegram_json(data):
    messages = data.get('messages', [])
    parsed_questions = []
    
    for msg in messages:
        if not msg.get('text'):
            continue
            
        text_content = msg['text']
        if isinstance(text_content, list):
            text_content = ''.join(
                item if isinstance(item, str) else item.get('text', '')
                for item in text_content
            )
        
        import re
        question_match = re.search(
            r'Question #(\d+)\n\n(.+?)\n\n([A-Z]\).+)',
            text_content,
            re.DOTALL
        )
        
        if question_match:
            question_number = int(question_match.group(1))
            question_text = question_match.group(2)
            options_text = question_match.group(3)
            
            is_multiple = bool(re.search(r'\(Select \d+\)', question_text))
            select_count_match = re.search(r'\(Select (\d+)\)', question_text)
            select_count = int(select_count_match.group(1)) if select_count_match else 1
            
            clean_question = question_text.strip()

            option_matches = re.findall(
                r'([A-Z])\)\s*(.+?)(?=\n[A-Z]\)|$)',
                options_text,
                re.DOTALL
            )
            
            options = [f"{letter}) {text.strip()}" for letter, text in option_matches]
            
            if options:
                question_id = generate_question_id(question_number, clean_question)
                parsed_questions.append({
                    'id': question_id,
                    'number': question_number,
                    'question': clean_question,
                    'options': options,
                    'is_multiple_choice': is_multiple,
                    'select_count': select_count
                })
    
    return parsed_questions

# ============================================
# API ROUTES
# ============================================
@app.route('/api/questions/paginated', methods=['GET'])
def get_paginated_questions():
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 12, type=int)
    search = request.args.get('search', '')
    lang = request.args.get('lang', 'en')
    
    query = Question.query
    
    if search:
        query = query.filter(Question.question.ilike(f'%{search}%'))
    
    pagination = query.order_by(Question.number).paginate(
        page=page, per_page=per_page, error_out=False
    )
    
    questions = [q.to_dict(lang) for q in pagination.items]
    
    return jsonify({
        'questions': questions,
        'total': pagination.total,
        'pages': pagination.pages,
        'currentPage': page,
        'perPage': per_page,
        'hasNext': pagination.has_next,
        'hasPrev': pagination.has_prev
    })

@app.route('/api/questions/upload', methods=['POST'])
def upload_questions():
    try:
        data = request.get_json()
        if not data:
            return jsonify({'error': 'No data provided'}), 400
        
        parsed_questions = parse_telegram_json(data)
        if not parsed_questions:
            return jsonify({'error': 'No questions found in file'}), 400
        
        new_count = 0
        existing_count = 0
        
        for q_data in parsed_questions:
            existing = db.session.get(Question, q_data['id'])
            if not existing:
                question = Question(
                    id=q_data['id'],
                    number=q_data['number'],
                    question=q_data['question'],
                    options=q_data['options'],
                    is_multiple_choice=q_data['is_multiple_choice'],
                    select_count=q_data['select_count']
                )
                db.session.add(question)
                new_count += 1
            else:
                existing_count += 1
        
        db.session.commit()
        total = Question.query.count()
        
        return jsonify({
            'message': 'Successfully processed!',
            'new': new_count,
            'duplicates': existing_count,
            'total': total
        })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f"Upload error: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/questions/random', methods=['GET'])
def get_random_question():
    from sqlalchemy import func
    lang = request.args.get('lang', 'en')
    question = Question.query.order_by(func.random()).first()
    
    if not question:
        return jsonify({'error': 'No questions available'}), 404
    
    return jsonify(question.to_dict(lang))

@app.route('/api/ai/check-answer', methods=['POST'])
@rate_limit
def check_answer():
    """
    Check answer using AI with proper concurrency control.
    Uses locking to prevent duplicate AI calls for the same question.
    """
    try:
        data = request.get_json()
        question_id = data.get('questionId')
        lang = data.get('lang', 'en')
        
        if not question_id:
            return jsonify({'error': 'Question ID required'}), 400
        
        # FIRST: Check cache (fast path, no lock needed)
        cache = db.session.get(AICache, question_id)
        if cache:
            # Handle Russian translation if needed
            if lang == 'ru' and not cache.explanation_ru:
                # Use lock for translation update
                lock = get_processing_lock(f"translate_{question_id}")
                with lock:
                    # Re-check after acquiring lock
                    db.session.refresh(cache)
                    if not cache.explanation_ru:
                        try:
                            cache.explanation_ru = translate_text(cache.explanation, 'explanation')
                            db.session.commit()
                        except Exception as e:
                            logger.error(f'Translation error: {e}')
                            db.session.rollback()
            
            return jsonify(cache.to_dict(lang))
        
        # SECOND: Acquire lock for AI processing
        lock = get_processing_lock(question_id)
        
        with lock:
            # Re-check cache after acquiring lock (another request might have created it)
            cache = db.session.get(AICache, question_id)
            if cache:
                return jsonify(cache.to_dict(lang))
            
            # Get question
            question = db.session.get(Question, question_id)
            if not question:
                return jsonify({'error': 'Question not found'}), 404
            
            logger.info(f"Processing AI request for question {question_id}")
            
            # Get AI answer
            result = get_ai_answer(
                question.question,
                question.options,
                question.is_multiple_choice,
                question.select_count
            )
            
            # Translate if needed
            explanation_ru = None
            if lang == 'ru':
                try:
                    explanation_ru = translate_text(result['explanation'], 'explanation')
                except Exception as e:
                    logger.error(f'Translation error: {e}')
            
            # Save to cache with proper error handling
            try:
                cache = AICache(
                    question_id=question_id,
                    correct_answers=result['correctAnswers'],
                    explanation=result['explanation'],
                    explanation_ru=explanation_ru
                )
                db.session.add(cache)
                db.session.commit()
                logger.info(f"Cached AI result for question {question_id}")
            except IntegrityError:
                # Another request already saved this - fetch it
                db.session.rollback()
                cache = db.session.get(AICache, question_id)
                if not cache:
                    raise Exception("Failed to save or retrieve cache")
            
            return jsonify(cache.to_dict(lang))
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'AI check error: {e}')
        return jsonify({'error': str(e)}), 500

@app.route('/api/ai/translate-question', methods=['POST'])
@rate_limit
def translate_question():
    """Translate question to Russian with concurrency control"""
    try:
        data = request.get_json()
        question_id = data.get('questionId')
        
        if not question_id:
            return jsonify({'error': 'Question ID required'}), 400
        
        logger.info(f"Translation request for question: {question_id}")
        
        # Check if already translated
        existing = Translation.query.filter_by(
            question_id=question_id,
            language='ru'
        ).first()
        
        if existing:
            logger.info(f"Translation exists for {question_id}")
            return jsonify({
                'question': existing.question_text,
                'options': existing.options
            })
        
        # Acquire lock for translation
        lock = get_processing_lock(f"q_translate_{question_id}")
        
        with lock:
            # Re-check after lock
            existing = Translation.query.filter_by(
                question_id=question_id,
                language='ru'
            ).first()
            
            if existing:
                logger.info(f"Translation created while waiting for lock: {question_id}")
                return jsonify({
                    'question': existing.question_text,
                    'options': existing.options
                })
            
            # Get original question
            question = db.session.get(Question, question_id)
            if not question:
                logger.error(f"Question not found: {question_id}")
                return jsonify({'error': 'Question not found'}), 404
            
            logger.info(f"Translating question {question_id}")
            
            # Translate question
            translated_question = translate_text(question.question, 'question')
            
            # Translate options
            translated_options = []
            for opt in question.options:
                try:
                    # Extract letter and text more safely
                    # Format is usually "A) text" or "A) text"
                    if len(opt) > 3 and opt[1:3] in [') ', '). ']:
                        letter = opt[0]
                        text = opt[2:].strip() if opt[1] == ')' else opt[3:].strip()
                    else:
                        # Fallback - just translate as is
                        logger.warning(f"Unusual option format: {opt[:20]}...")
                        letter = opt[0] if len(opt) > 0 else 'A'
                        text = opt[3:] if len(opt) > 3 else opt
                    
                    # Clean the text
                    text = text.replace('Your responses:', '').replace('Your response:', '').strip()
                    
                    # Translate
                    translated = translate_text(text, 'question')
                    translated_options.append(f"{letter}) {translated}")
                    
                except Exception as e:
                    logger.error(f"Error translating option '{opt[:50]}...': {e}")
                    # Use original if translation fails
                    translated_options.append(opt)
            
            # Save translation
            try:
                translation = Translation(
                    question_id=question_id,
                    language='ru',
                    question_text=translated_question,
                    options=translated_options
                )
                db.session.add(translation)
                db.session.commit()
                logger.info(f"Translation saved for {question_id}")
            except IntegrityError:
                db.session.rollback()
                logger.warning(f"Translation already exists (race condition): {question_id}")
                existing = Translation.query.filter_by(
                    question_id=question_id,
                    language='ru'
                ).first()
                if existing:
                    return jsonify({
                        'question': existing.question_text,
                        'options': existing.options
                    })
                else:
                    raise Exception("Failed to save or retrieve translation")
            
            return jsonify({
                'question': translated_question,
                'options': translated_options
            })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Translation error for {question_id}: {e}')
        logger.exception("Full traceback:")
        return jsonify({'error': str(e)}), 500
    """Translate question to Russian with concurrency control"""
    try:
        data = request.get_json()
        question_id = data.get('questionId')
        
        if not question_id:
            return jsonify({'error': 'Question ID required'}), 400
        
        # Check if already translated
        existing = Translation.query.filter_by(
            question_id=question_id,
            language='ru'
        ).first()
        
        if existing:
            return jsonify({
                'question': existing.question_text,
                'options': existing.options
            })
        
        # Acquire lock for translation
        lock = get_processing_lock(f"q_translate_{question_id}")
        
        with lock:
            # Re-check after lock
            existing = Translation.query.filter_by(
                question_id=question_id,
                language='ru'
            ).first()
            
            if existing:
                return jsonify({
                    'question': existing.question_text,
                    'options': existing.options
                })
            
            # Get original question
            question = db.session.get(Question, question_id)
            if not question:
                return jsonify({'error': 'Question not found'}), 404
            
            # Translate
            translated_question = translate_text(question.question, 'question')
            translated_options = []
            for opt in question.options:
                letter = opt[0]
                text = opt[3:]  # Skip "A) "
                translated = translate_text(text, 'question')
                translated_options.append(f"{letter}) {translated}")
            
            # Save translation
            try:
                translation = Translation(
                    question_id=question_id,
                    language='ru',
                    question_text=translated_question,
                    options=translated_options
                )
                db.session.add(translation)
                db.session.commit()
            except IntegrityError:
                db.session.rollback()
                existing = Translation.query.filter_by(
                    question_id=question_id,
                    language='ru'
                ).first()
                return jsonify({
                    'question': existing.question_text,
                    'options': existing.options
                })
            
            return jsonify({
                'question': translated_question,
                'options': translated_options
            })
        
    except Exception as e:
        db.session.rollback()
        logger.error(f'Translation error: {e}')
        return jsonify({'error': str(e)}), 500
    

@app.route('/api/questions/<question_id>', methods=['GET'])
def get_question_by_id(question_id):
    """Get specific question by ID"""
    lang = request.args.get('lang', 'en')
    question = db.session.get(Question, question_id)
    
    if not question:
        return jsonify({'error': 'Question not found'}), 404
    
    return jsonify(question.to_dict(lang))

@app.route('/api/ai-cache/<question_id>', methods=['GET'])
def get_ai_cache(question_id):
    lang = request.args.get('lang', 'en')
    cache = db.session.get(AICache, question_id)
    
    if not cache:
        return jsonify({'error': 'Not found'}), 404
    
    return jsonify(cache.to_dict(lang))

@app.route('/api/stats', methods=['GET'])
def get_stats():
    total_questions = Question.query.count()
    cached_answers = AICache.query.count()
    translations_count = Translation.query.filter_by(language='ru').count()
    
    return jsonify({
        'totalQuestions': total_questions,
        'cachedAnswers': cached_answers,
        'translationsCount': translations_count,
        'coverage': round((cached_answers / total_questions * 100) if total_questions > 0 else 0, 2)
    })

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint for Railway"""
    try:
        # Check database connection
        db.session.execute(text('SELECT 1'))
        return jsonify({
            'status': 'healthy',
            'database': 'connected',
            'timestamp': datetime.utcnow().isoformat()
        })
    except Exception as e:
        return jsonify({
            'status': 'unhealthy',
            'error': str(e)
        }), 500

# ============================================
# IP WHITELIST ADMIN ROUTES
# ============================================
@app.route('/blocked')
def blocked_page():
    """Page shown to blocked IPs"""
    client_ip = get_client_ip()
    # Serve the blocked.html file
    return send_from_directory(app.static_folder, 'blocked.html')

@app.route('/admin/login')
def admin_login_page():
    """Admin login page"""
    return '''
    <!DOCTYPE html>
    <html>
    <head>
        <title>Admin Login</title>
        <style>
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            }
            .login-box {
                background: white;
                padding: 40px;
                border-radius: 20px;
                box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                width: 100%;
                max-width: 400px;
            }
            h2 { text-align: center; margin-bottom: 30px; }
            input {
                width: 100%;
                padding: 15px;
                margin: 10px 0;
                border: 2px solid #e2e8f0;
                border-radius: 10px;
                font-size: 1rem;
                box-sizing: border-box;
            }
            button {
                width: 100%;
                padding: 15px;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                border: none;
                border-radius: 10px;
                font-size: 1.1rem;
                cursor: pointer;
                margin-top: 10px;
            }
            button:hover { opacity: 0.9; }
            .error { color: #e53e3e; text-align: center; margin-top: 15px; }
        </style>
    </head>
    <body>
        <div class="login-box">
            <h2>🔐 Admin Login</h2>
            <form method="POST" action="/admin/auth">
                <input type="password" name="password" placeholder="Enter admin password" required>
                <button type="submit">Login</button>
            </form>
            <p id="error" class="error"></p>
        </div>
    </body>
    </html>
    '''

@app.route('/admin/auth', methods=['POST'])
def admin_auth():
    """Authenticate admin"""
    password = request.form.get('password')
    
    if password == ADMIN_PASSWORD:
        response = make_response(redirect('/admin'))
        response.set_cookie('admin_token', hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest(), 
                          httponly=True, max_age=86400)  # 24 hours
        return response
    
    return redirect('/admin/login?error=1')

def admin_required(f):
    """Decorator to require admin authentication"""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.cookies.get('admin_token')
        expected = hashlib.sha256(ADMIN_PASSWORD.encode()).hexdigest()
        if token != expected:
            return redirect('/admin/login')
        return f(*args, **kwargs)
    return decorated

@app.route('/admin')
@admin_required
def admin_panel():
    """Admin panel for managing IPs"""
    # Serve the admin.html file
    return send_from_directory(app.static_folder, 'admin.html')

@app.route('/admin/api/current-ip', methods=['GET'])
@admin_required
def get_current_ip():
    """API endpoint to get current IP for admin panel"""
    return jsonify({'ip': get_client_ip()})

@app.route('/admin/logout')
def admin_logout():
    """Logout admin"""
    response = make_response(redirect('/admin/login'))
    response.delete_cookie('admin_token')
    return response

@app.route('/admin/api/ips', methods=['GET', 'POST'])
@admin_required
def admin_ips():
    """API for managing IPs"""
    if request.method == 'GET':
        ips = AllowedIP.query.all()
        return jsonify([ip.to_dict() for ip in ips])
    
    # POST - add new IP
    data = request.get_json()
    ip_address = data.get('ip', '').strip()
    description = data.get('description', '').strip()
    
    if not ip_address:
        return jsonify({'error': 'IP address required'}), 400
    
    # Check if already exists
    existing = AllowedIP.query.filter_by(ip_address=ip_address).first()
    if existing:
        return jsonify({'error': 'IP already exists'}), 409
    
    new_ip = AllowedIP(
        ip_address=ip_address,
        description=description,
        is_active=True
    )
    db.session.add(new_ip)
    db.session.commit()
    
    # Add to in-memory cache
    allowed_ips.add(ip_address)
    
    return jsonify(new_ip.to_dict()), 201

@app.route('/admin/api/ips/<int:ip_id>', methods=['PATCH', 'DELETE'])
@admin_required
def admin_ip_detail(ip_id):
    """Update or delete IP"""
    ip = db.session.get(AllowedIP, ip_id)
    if not ip:
        return jsonify({'error': 'IP not found'}), 404
    
    if request.method == 'DELETE':
        # Remove from cache
        allowed_ips.discard(ip.ip_address)
        db.session.delete(ip)
        db.session.commit()
        return jsonify({'success': True})
    
    # PATCH - update
    data = request.get_json()
    if 'is_active' in data:
        ip.is_active = data['is_active']
        if data['is_active']:
            allowed_ips.add(ip.ip_address)
        else:
            allowed_ips.discard(ip.ip_address)
    if 'description' in data:
        ip.description = data['description']
    
    db.session.commit()
    return jsonify(ip.to_dict())

@app.cli.command()
def init_db():
    db.create_all()
    print("Database initialized!")

# Serve frontend
@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve(path):
    logger.info(f"Serve request: path='{path}', static_folder='{app.static_folder}'")
    
    if path and path.startswith('api'):
        # Let API routes handle this
        return jsonify({'error': 'Not found'}), 404
    
    try:
        if path and os.path.exists(os.path.join(app.static_folder, path)):
            logger.info(f"Serving file: {path}")
            return send_from_directory(app.static_folder, path)
        
        index_path = os.path.join(app.static_folder, 'index.html')
        logger.info(f"Serving index.html, exists: {os.path.exists(index_path)}")
        return send_from_directory(app.static_folder, 'index.html')
    except Exception as e:
        logger.error(f"Error serving {path}: {e}")
        return jsonify({'error': str(e)}), 500

# ============================================
# AUTO-CREATE TABLES ON STARTUP
# ============================================
logger.info("=" * 50)
logger.info("STARTING APPLICATION")
logger.info(f"Static folder exists: {os.path.exists('dist')}")
logger.info(f"Static folder contents: {os.listdir('dist') if os.path.exists('dist') else 'N/A'}")
logger.info(f"DATABASE_URL set: {bool(os.getenv('DATABASE_URL'))}")
logger.info(f"OPENAI_API_KEY set: {bool(OPENAI_API_KEY)}")
logger.info("=" * 50)

with app.app_context():
    try:
        logger.info("Attempting to create database tables...")
        # Use checkfirst=True to skip existing tables
        db.create_all()
        logger.info("Database tables created/verified successfully")
        
        # Test database connection
        db.session.execute(text('SELECT 1'))
        logger.info("Database connection test: OK")
    except Exception as e:
        # If tables already exist, that's fine
        if "already exists" in str(e) or "duplicate key" in str(e).lower():
            logger.info("Tables already exist - skipping creation")
            try:
                db.session.execute(text('SELECT 1'))
                logger.info("Database connection test: OK")
            except Exception as e2:
                logger.error(f"Database connection failed: {e2}")
        else:
            logger.error(f"Failed to initialize database: {e}")
            logger.exception("Full traceback:")

# ============================================
# PRODUCTION SERVER CONFIGURATION
# ============================================
if __name__ == '__main__':
    # Development mode
    app.run(debug=True, port=5000)
else:
    # Production mode - use gunicorn
    # Command: gunicorn app:app --workers 4 --threads 2 --bind 0.0.0.0:$PORT
    pass