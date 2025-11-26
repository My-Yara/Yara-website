/**
 * Yara Survey Application
 * Handles authentication, survey rendering, progress tracking, and data submission
 */

class YaraSurveyApp {
    constructor() {
        this.currentUser = null;
        this.currentSection = null;
        this.currentQuestionIndex = 0;
        this.surveyData = {};
        this.startTime = null;

        // Initialize
        this.init();
    }

    init() {
        // Check for saved progress
        this.loadProgress();

        // Setup event listeners
        this.setupLoginHandler();
    }

    /**
     * Hash password using SHA-256 (matching server-side)
     */
    async hashPassword(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    }

    /**
     * Setup login form handler
     */
    setupLoginHandler() {
        const loginForm = document.getElementById('login-form');
        if (loginForm) {
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }
    }

    /**
     * Handle login submission
     */
    async handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;
        const errorEl = document.getElementById('login-error');
        const submitBtn = event.target.querySelector('button[type="submit"]');

        // Clear previous errors
        if (errorEl) errorEl.textContent = '';

        // Disable button during request
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';

        try {
            // Call authentication function
            const response = await fetch('https://yara-survey-api.netlify.app/.netlify/functions/authenticate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (response.ok && result.success) {
                // Authentication successful
                this.currentUser = result.userId;
                this.startTime = new Date();

                // Close login modal
                this.closeModal('login-modal');

                // Show welcome message
                setTimeout(() => {
                    this.startSurvey();
                }, 300);
            } else {
                // Authentication failed
                if (errorEl) {
                    errorEl.textContent = result.message || 'Invalid email or password';
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            if (errorEl) {
                errorEl.textContent = 'Authentication failed. Please try again.';
            }
        } finally {
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        }
    }

    /**
     * Start the survey
     */
    startSurvey() {
        // Check if there's saved progress
        const savedProgress = localStorage.getItem(`yara_survey_${this.currentUser}`);

        if (savedProgress) {
            // Show resume option
            this.showResumeDialog();
        } else {
            // Start fresh
            this.showSurveyWelcome();
        }
    }

    /**
     * Show resume dialog
     */
    showResumeDialog() {
        const modal = document.getElementById('resume-modal');
        if (modal) {
            modal.classList.add('active');
        }
    }

    /**
     * Resume from saved progress
     */
    resumeSurvey() {
        const savedData = localStorage.getItem(`yara_survey_${this.currentUser}`);
        if (savedData) {
            const progress = JSON.parse(savedData);
            this.surveyData = progress.surveyData;
            this.currentSection = progress.currentSection;
            this.currentQuestionIndex = progress.currentQuestionIndex;
        }

        this.closeModal('resume-modal');
        this.renderCurrentQuestion();
    }

    /**
     * Start fresh survey
     */
    startFresh() {
        // Clear any saved progress
        localStorage.removeItem(`yara_survey_${this.currentUser}`);
        this.surveyData = {};
        this.currentSection = 'A';
        this.currentQuestionIndex = 0;

        this.closeModal('resume-modal');
        this.showSurveyWelcome();
    }

    /**
     * Show survey welcome screen
     */
    showSurveyWelcome() {
        const meta = SURVEY_QUESTIONS.metadata;
        const sectionCount = Object.keys(meta.sections).length;

        const welcomeHTML = `
            <div class="survey-welcome">
                <div style="font-size: 4rem; margin-bottom: 20px;">🦋</div>
                <h2>Welcome to the Yara Stakeholder Survey</h2>
                <p>Thank you for helping train Yara's personality and negotiation skills!</p>
                <div class="survey-info">
                    <div class="info-item">
                        <strong>📊 ${meta.totalQuestions} Questions</strong>
                        <p>In ${sectionCount} sections</p>
                    </div>
                    <div class="info-item">
                        <strong>⏱️ ${meta.estimatedTime}</strong>
                        <p>Estimated time</p>
                    </div>
                    <div class="info-item">
                        <strong>💾 Auto-Save</strong>
                        <p>Progress saved automatically</p>
                    </div>
                </div>
                <p class="survey-note">Questions are prioritized by impact. Early questions are most valuable for training.</p>
                <button class="btn-primary" onclick="surveyApp.beginSurvey()" style="width:100%; margin-top: 20px;">
                    Begin Survey
                </button>
            </div>
        `;

        this.showSurveyModal(welcomeHTML);
    }

    /**
     * Begin the survey
     */
    beginSurvey() {
        this.currentSection = 'A';
        this.currentQuestionIndex = 0;
        this.renderCurrentQuestion();
    }

    /**
     * Render current question
     */
    renderCurrentQuestion() {
        const questions = this.currentSection === 'A' ?
            SURVEY_QUESTIONS.sectionA.questions :
            SURVEY_QUESTIONS.sectionB.questions;

        const question = questions[this.currentQuestionIndex];

        if (!question) {
            // Check if we need to move to section B
            if (this.currentSection === 'A') {
                this.showSectionTransition();
            } else {
                // Survey complete
                this.showSurveyComplete();
            }
            return;
        }

        const questionHTML = this.generateQuestionHTML(question);
        this.showSurveyModal(questionHTML);
        this.updateProgressBar();
    }

    /**
     * Generate HTML for a question based on its type
     */
    generateQuestionHTML(question) {
        const totalQuestions = 25;
        const currentNum = this.currentSection === 'A' ?
            this.currentQuestionIndex + 1 :
            this.currentQuestionIndex + 16;

        let html = `
            <div class="question-container">
                <div class="question-header">
                    <span class="question-number">Question ${currentNum} of ${totalQuestions}</span>
                    <span class="section-label">Section ${this.currentSection}</span>
                </div>

                <h2 class="question-title">${question.title}</h2>

                ${question.context ? `<div class="question-context">${question.context.replace(/\n/g, '<br>')}</div>` : ''}
        `;

        // Generate fields based on question type
        html += `<form id="question-form" onsubmit="surveyApp.handleQuestionSubmit(event); return false;">`;

        switch (question.type) {
            case 'single-choice':
                html += this.generateSingleChoice(question);
                break;
            case 'multi-scenario':
                html += this.generateMultiScenario(question);
                break;
            case 'ranking':
                html += this.generateRanking(question);
                break;
            case 'scale-rating':
                html += this.generateScaleRating(question);
                break;
            case 'open-ended':
                html += this.generateOpenEnded(question);
                break;
        }

        // Add follow-up questions if present
        if (question.followUp && question.followUp.length > 0) {
            html += `<div class="follow-up-section">`;
            question.followUp.forEach(followUp => {
                html += this.generateField(followUp);
            });
            html += `</div>`;
        }

        // Navigation buttons
        html += `
            <div class="question-navigation">
                ${this.currentQuestionIndex > 0 || this.currentSection === 'B' ?
                    `<button type="button" class="btn-secondary" onclick="surveyApp.previousQuestion()">← Previous</button>` :
                    '<div></div>'}
                <button type="button" class="btn-tertiary" onclick="surveyApp.saveAndExit()">Save & Exit</button>
                <button type="submit" class="btn-primary">Next →</button>
            </div>
        `;

        html += `</form></div>`;

        return html;
    }

    /**
     * Generate single choice question
     */
    generateSingleChoice(question) {
        let html = `
            <div class="question-prompt">${question.question}</div>
            <div class="options-container">
        `;

        question.options.forEach((option, index) => {
            html += `
                <label class="option-card">
                    <input type="radio" name="choice" value="${option.id}" required>
                    <div class="option-content">
                        <span class="option-label">${String.fromCharCode(65 + index)}</span>
                        <span class="option-text">${option.text}</span>
                    </div>
                </label>
            `;
        });

        html += `</div>`;
        return html;
    }

    /**
     * Generate multi-scenario question
     */
    generateMultiScenario(question) {
        let html = '';

        question.scenarios.forEach((scenario, index) => {
            html += `
                <div class="scenario-container">
                    <h3 class="scenario-title">Scenario ${String.fromCharCode(65 + index)}</h3>
                    <p class="scenario-description">${scenario.description}</p>

                    <div class="scenario-fields">
            `;

            scenario.fields.forEach(field => {
                html += this.generateField({...field, name: `${scenario.id}_${field.name}`});
            });

            html += `
                    </div>
                </div>
            `;
        });

        return html;
    }

    /**
     * Generate ranking question
     */
    generateRanking(question) {
        let html = `
            <div class="question-prompt">${question.question}</div>
            <div class="ranking-container">
        `;

        question.versions.forEach((version, index) => {
            html += `
                <div class="ranking-item">
                    <div class="ranking-header">
                        <strong>${version.label}</strong>
                        <select name="rank_${version.id}" required class="ranking-select">
                            <option value="">Rank...</option>
                            <option value="1">1 (Best)</option>
                            <option value="2">2</option>
                            <option value="3">3 (Worst)</option>
                        </select>
                    </div>
                    <p class="ranking-text">${version.text}</p>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    /**
     * Generate scale rating question
     */
    generateScaleRating(question) {
        let html = `
            <div class="question-prompt">${question.question}</div>
            <div class="scale-container">
        `;

        question.versions.forEach((version, index) => {
            html += `
                <div class="scale-item">
                    <p class="scale-text">${version.text}</p>
                    <div class="scale-options">
                        <span class="scale-label">Too Formal</span>
                        ${[1, 2, 3, 4, 5].map(val => `
                            <label class="scale-radio">
                                <input type="radio" name="rating_${version.id}" value="${val}" required>
                                <span class="scale-value">${val}</span>
                            </label>
                        `).join('')}
                        <span class="scale-label">Too Casual</span>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        return html;
    }

    /**
     * Generate open-ended question
     */
    generateOpenEnded(question) {
        let html = `<div class="open-ended-container">`;

        if (question.question) {
            html += `<div class="question-prompt">${question.question}</div>`;
        }

        question.fields.forEach(field => {
            html += this.generateField(field);
        });

        html += `</div>`;
        return html;
    }

    /**
     * Generate a form field
     */
    generateField(field) {
        let html = `<div class="form-field">`;

        if (field.label) {
            html += `<label class="field-label">${field.label}</label>`;
        }

        switch (field.type) {
            case 'select':
                html += `
                    <select name="${field.name}" class="form-select" required>
                        <option value="">Select...</option>
                        ${field.options.map(opt => `<option value="${opt}">${opt}</option>`).join('')}
                    </select>
                `;
                break;

            case 'textarea':
                html += `
                    <textarea
                        name="${field.name}"
                        class="form-textarea"
                        placeholder="${field.placeholder || ''}"
                        ${field.required !== false ? 'required' : ''}
                    ></textarea>
                `;
                break;

            case 'number':
                html += `
                    <input
                        type="number"
                        name="${field.name}"
                        class="form-input"
                        placeholder="${field.placeholder || ''}"
                        ${field.required !== false ? 'required' : ''}
                    >
                `;
                break;

            case 'text':
                html += `
                    <input
                        type="text"
                        name="${field.name}"
                        class="form-input"
                        placeholder="${field.placeholder || ''}"
                        ${field.required !== false ? 'required' : ''}
                    >
                `;
                break;

            case 'radio':
                field.options.forEach(opt => {
                    html += `
                        <label class="radio-option">
                            <input type="radio" name="${field.name}" value="${opt}" required>
                            <span>${opt}</span>
                        </label>
                    `;
                });
                break;
        }

        html += `</div>`;
        return html;
    }

    /**
     * Handle question form submission
     */
    handleQuestionSubmit(event) {
        event.preventDefault();

        const formData = new FormData(event.target);
        const questionData = {};

        for (let [key, value] of formData.entries()) {
            questionData[key] = value;
        }

        // Save answer
        const questionId = this.getCurrentQuestionId();
        this.surveyData[questionId] = questionData;

        // Save progress
        this.saveProgress();

        // Move to next question
        this.nextQuestion();
    }

    /**
     * Get current question ID
     */
    getCurrentQuestionId() {
        const questions = this.currentSection === 'A' ?
            SURVEY_QUESTIONS.sectionA.questions :
            SURVEY_QUESTIONS.sectionB.questions;
        return questions[this.currentQuestionIndex].id;
    }

    /**
     * Move to next question
     */
    nextQuestion() {
        this.currentQuestionIndex++;
        this.renderCurrentQuestion();
    }

    /**
     * Move to previous question
     */
    previousQuestion() {
        if (this.currentQuestionIndex > 0) {
            this.currentQuestionIndex--;
        } else if (this.currentSection === 'B') {
            // Go back to last question of section A
            this.currentSection = 'A';
            this.currentQuestionIndex = SURVEY_QUESTIONS.sectionA.questions.length - 1;
        }
        this.renderCurrentQuestion();
    }

    /**
     * Show section transition
     */
    showSectionTransition() {
        const html = `
            <div class="section-transition">
                <div class="transition-animation">
                    <div class="cocoon">🥚</div>
                    <div class="butterfly">🦋</div>
                </div>
                <h2>Excellent Progress!</h2>
                <p>You've completed Section A: Core Decision Trees</p>
                <p class="transition-message">Now let's refine Yara's personality and handle edge cases.</p>
                <div class="progress-stats">
                    <div class="stat">
                        <strong>15 of 25</strong>
                        <span>Questions Complete</span>
                    </div>
                    <div class="stat">
                        <strong>~10 minutes</strong>
                        <span>Remaining</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="surveyApp.continueSurvey()" style="width:100%; margin-top: 20px;">
                    Continue to Section B →
                </button>
            </div>
        `;

        this.showSurveyModal(html);
    }

    /**
     * Continue to section B
     */
    continueSurvey() {
        this.currentSection = 'B';
        this.currentQuestionIndex = 0;
        this.renderCurrentQuestion();
    }

    /**
     * Show survey complete screen
     */
    showSurveyComplete() {
        const html = `
            <div class="survey-complete">
                <div style="font-size: 5rem; margin-bottom: 20px;">✨</div>
                <h2>Survey Complete!</h2>
                <p>Thank you for your invaluable insights.</p>
                <p class="complete-message">Your responses will directly shape Yara's decision-making framework and personality.</p>

                ${this.renderFinalComments()}

                <button class="btn-primary" onclick="surveyApp.submitSurvey()" style="width:100%; margin-top: 20px;">
                    Submit Survey
                </button>
            </div>
        `;

        this.showSurveyModal(html);
    }

    /**
     * Render final comments section
     */
    renderFinalComments() {
        return `
            <div class="final-comments">
                <h3>Additional Insights (Optional)</h3>
                <p>${SURVEY_QUESTIONS.finalComments.question}</p>
                <textarea
                    id="final-comments"
                    class="form-textarea"
                    placeholder="${SURVEY_QUESTIONS.finalComments.placeholder}"
                    rows="5"
                ></textarea>
            </div>
        `;
    }

    /**
     * Submit survey
     */
    async submitSurvey() {
        // Get final comments
        const finalComments = document.getElementById('final-comments')?.value || '';

        // Calculate completion time
        const completionTime = this.calculateCompletionTime();

        // Prepare final data
        const surveySubmission = {
            userId: this.currentUser,
            timestamp: new Date().toISOString(),
            surveyVersion: SURVEY_QUESTIONS.metadata.version,
            completionTime: completionTime,
            responses: this.surveyData,
            finalComments: finalComments
        };

        // Show loading state
        const submitBtn = document.querySelector('.survey-complete button');
        if (submitBtn) {
            submitBtn.disabled = true;
            submitBtn.textContent = 'Submitting...';
        }

        try {
            // Submit to Netlify function
            const response = await fetch('https://yara-survey-api.netlify.app/.netlify/functions/submit-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(surveySubmission)
            });

            const result = await response.json();

            if (response.ok) {
                // Clear saved progress
                localStorage.removeItem(`yara_survey_${this.currentUser}`);

                // Show success
                this.showSubmissionSuccess();
            } else {
                throw new Error(result.message || 'Submission failed');
            }
        } catch (error) {
            console.error('Submission error:', error);
            alert('Failed to submit survey. Please try again.');

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Submit Survey';
            }
        }
    }

    /**
     * Show submission success
     */
    showSubmissionSuccess() {
        const html = `
            <div class="submission-success">
                <div style="font-size: 5rem; margin-bottom: 20px;">🎉</div>
                <h2>Thank You!</h2>
                <p>Your survey has been securely encrypted and saved.</p>
                <p class="success-message">Your insights will help train Yara to be the best advocate for users.</p>
                <button class="btn-primary" onclick="location.reload()" style="width:100%; margin-top: 20px;">
                    Return to Home
                </button>
            </div>
        `;

        this.showSurveyModal(html);
    }

    /**
     * Calculate completion time
     */
    calculateCompletionTime() {
        if (!this.startTime) return 'N/A';

        const endTime = new Date();
        const diffMs = endTime - this.startTime;
        const minutes = Math.floor(diffMs / 60000);

        return `${minutes} minutes`;
    }

    /**
     * Save progress to localStorage
     */
    saveProgress() {
        const progress = {
            currentSection: this.currentSection,
            currentQuestionIndex: this.currentQuestionIndex,
            surveyData: this.surveyData,
            lastSaved: new Date().toISOString()
        };

        localStorage.setItem(`yara_survey_${this.currentUser}`, JSON.stringify(progress));
    }

    /**
     * Load progress from localStorage
     */
    loadProgress() {
        // This will be called when needed
    }

    /**
     * Save and exit
     */
    saveAndExit() {
        this.saveProgress();
        alert('Progress saved! You can resume anytime by logging in again.');
        this.closeModal('survey-modal');
        location.reload();
    }

    /**
     * Update progress bar
     */
    updateProgressBar() {
        const totalQuestions = 25;
        const currentNum = this.currentSection === 'A' ?
            this.currentQuestionIndex + 1 :
            this.currentQuestionIndex + 16;

        const progress = (currentNum / totalQuestions) * 100;

        const progressBar = document.getElementById('survey-progress-bar');
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
        }

        const progressText = document.getElementById('survey-progress-text');
        if (progressText) {
            progressText.textContent = `${currentNum} of ${totalQuestions}`;
        }
    }

    /**
     * Show survey modal
     */
    showSurveyModal(content) {
        const modal = document.getElementById('survey-modal');
        if (modal) {
            const contentEl = modal.querySelector('.modal-content-inner');
            if (contentEl) {
                contentEl.innerHTML = content;
            }
            modal.classList.add('active');
        }
    }

    /**
     * Close modal
     */
    closeModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('active');
        }
    }
}

// Initialize the app when DOM is loaded
let surveyApp;
document.addEventListener('DOMContentLoaded', () => {
    surveyApp = new YaraSurveyApp();
});
