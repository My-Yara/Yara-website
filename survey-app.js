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
        this.currentSection = 'strategic';
        this.currentQuestionIndex = 0;
        this.renderCurrentQuestion();
    }

    /**
     * Get current section's questions
     */
    getCurrentSectionQuestions() {
        switch (this.currentSection) {
            case 'strategic':
                return SURVEY_QUESTIONS.strategicPrioritization.questions;
            case 'A':
                return SURVEY_QUESTIONS.sectionA.questions;
            case 'B':
                return SURVEY_QUESTIONS.sectionB.questions;
            case 'C':
                return SURVEY_QUESTIONS.sectionC.questions;
            default:
                return [];
        }
    }

    /**
     * Render current question
     */
    renderCurrentQuestion() {
        const questions = this.getCurrentSectionQuestions();
        const question = questions[this.currentQuestionIndex];

        if (!question) {
            // Move to next section
            if (this.currentSection === 'strategic') {
                this.currentSection = 'A';
                this.currentQuestionIndex = 0;
                this.showSectionTransition('Strategic Feature Prioritization', 'SECTION A: Core Decisions');
            } else if (this.currentSection === 'A') {
                this.currentSection = 'B';
                this.currentQuestionIndex = 0;
                this.showSectionTransition('Section A', 'SECTION B: Tactical Skills');
            } else if (this.currentSection === 'B') {
                this.currentSection = 'C';
                this.currentQuestionIndex = 0;
                this.showSectionTransition('Section B', 'SECTION C: Refinements & Edge Cases');
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
     * Calculate current absolute question number
     */
    getCurrentQuestionNumber() {
        let num = 1;
        if (this.currentSection === 'strategic') {
            num = this.currentQuestionIndex + 1;
        } else if (this.currentSection === 'A') {
            num = SURVEY_QUESTIONS.strategicPrioritization.questions.length + this.currentQuestionIndex + 1;
        } else if (this.currentSection === 'B') {
            num = SURVEY_QUESTIONS.strategicPrioritization.questions.length +
                  SURVEY_QUESTIONS.sectionA.questions.length +
                  this.currentQuestionIndex + 1;
        } else if (this.currentSection === 'C') {
            num = SURVEY_QUESTIONS.strategicPrioritization.questions.length +
                  SURVEY_QUESTIONS.sectionA.questions.length +
                  SURVEY_QUESTIONS.sectionB.questions.length +
                  this.currentQuestionIndex + 1;
        }
        return num;
    }

    /**
     * Generate HTML for a question based on its type
     */
    generateQuestionHTML(question) {
        const totalQuestions = SURVEY_QUESTIONS.metadata.totalQuestions;
        const currentNum = this.getCurrentQuestionNumber();

        const sectionLabel = this.currentSection === 'strategic' ? 'Strategic' : `Section ${this.currentSection}`;

        let html = `
            <div class="question-container">
                <div class="question-header">
                    <span class="question-number">Question ${currentNum} of ${totalQuestions}</span>
                    <span class="section-label">${sectionLabel}</span>
                </div>

                <h2 class="question-title">${question.title}</h2>

                ${question.context ? `<div class="question-context">${question.context.replace(/\n/g, '<br>')}</div>` : ''}
                ${question.scenario ? `<div class="question-context">${question.scenario.replace(/\n/g, '<br>')}</div>` : ''}
        `;

        // Generate fields based on question type
        html += `<form id="question-form" onsubmit="surveyApp.handleQuestionSubmit(event); return false;">`;

        switch (question.type) {
            case 'single-choice':
            case 'multiple-choice':
                html += this.generateMultipleChoice(question);
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
     * Generate multiple choice question
     */
    generateMultipleChoice(question) {
        let html = '';

        if (question.question) {
            html += `<div class="question-prompt"><strong>${question.question}</strong></div>`;
        }

        html += `<div class="options-container">`;

        question.options.forEach((option, index) => {
            const optionLabel = option.id || String.fromCharCode(65 + index);
            html += `
                <label class="option-card">
                    <input type="radio" name="choice" value="${optionLabel}" required>
                    <div class="option-content">
                        <div class="option-header">
                            <span class="option-label">Option ${optionLabel}</span>
                            <span class="option-text"><strong>${option.text}</strong></span>
                        </div>
                        ${option.detail ? `<div class="option-detail">${option.detail}</div>` : ''}
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
        let html = '';

        if (question.context) {
            html += `<div class="question-prompt">${question.context}</div>`;
        }

        html += `<div class="ranking-container">`;

        // Handle both capabilities and insights
        const items = question.capabilities || question.insights || [];
        const itemCount = items.length;

        items.forEach((item, index) => {
            html += `
                <div class="ranking-item">
                    <div class="ranking-header">
                        <strong>${item.name}</strong>
                        <select name="rank_${item.id}" required class="ranking-select">
                            <option value="">Rank...</option>
                            ${Array.from({length: itemCount}, (_, i) => `
                                <option value="${i + 1}">${i + 1}${i === 0 ? ' (Most critical)' : i === itemCount - 1 ? ' (Least critical)' : ''}</option>
                            `).join('')}
                        </select>
                    </div>
                    <p class="ranking-text">${item.description || item.example || ''}</p>
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

        // For open-ended questions, the scenario is shown in the main HTML
        // and followUp questions are handled by the main generateQuestionHTML function
        // So we just need a placeholder here

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
        } else if (this.currentSection === 'A') {
            this.currentSection = 'strategic';
            this.currentQuestionIndex = SURVEY_QUESTIONS.strategicPrioritization.questions.length - 1;
        } else if (this.currentSection === 'B') {
            this.currentSection = 'A';
            this.currentQuestionIndex = SURVEY_QUESTIONS.sectionA.questions.length - 1;
        } else if (this.currentSection === 'C') {
            this.currentSection = 'B';
            this.currentQuestionIndex = SURVEY_QUESTIONS.sectionB.questions.length - 1;
        }
        this.renderCurrentQuestion();
    }

    /**
     * Calculate remaining time based on incomplete sections
     */
    calculateRemainingTime() {
        const sections = SURVEY_QUESTIONS.metadata.sections;
        let remainingMinutes = 0;

        // Check which sections are remaining
        if (this.currentSection === 'strategic') {
            // All sections remain
            remainingMinutes = parseInt(sections.strategic.time) +
                             parseInt(sections.A.time) +
                             parseInt(sections.B.time) +
                             parseInt(sections.C.time);
        } else if (this.currentSection === 'A') {
            // Sections A, B, C remain
            remainingMinutes = parseInt(sections.A.time) +
                             parseInt(sections.B.time) +
                             parseInt(sections.C.time);
        } else if (this.currentSection === 'B') {
            // Sections B, C remain
            remainingMinutes = parseInt(sections.B.time) +
                             parseInt(sections.C.time);
        } else if (this.currentSection === 'C') {
            // Only section C remains
            remainingMinutes = parseInt(sections.C.time);
        }

        return remainingMinutes;
    }

    /**
     * Show section transition
     */
    showSectionTransition(completedSection, nextSection) {
        const currentNum = this.getCurrentQuestionNumber() - 1; // Subtract 1 since we're transitioning
        const totalQuestions = SURVEY_QUESTIONS.metadata.totalQuestions;
        const remainingTime = this.calculateRemainingTime();

        const html = `
            <div class="section-transition">
                <div class="transition-animation">
                    <div class="cocoon">🥚</div>
                    <div class="butterfly">🦋</div>
                </div>
                <h2>Excellent Progress!</h2>
                <p>You've completed ${completedSection}</p>
                <p class="transition-message">Next: ${nextSection}</p>
                <div class="progress-stats">
                    <div class="stat">
                        <strong>${currentNum} of ${totalQuestions}</strong>
                        <span>Questions Complete</span>
                    </div>
                    <div class="stat">
                        <strong>~${remainingTime} minutes</strong>
                        <span>Remaining</span>
                    </div>
                </div>
                <button class="btn-primary" onclick="surveyApp.continueSurvey()" style="width:100%; margin-top: 20px;">
                    Continue →
                </button>
            </div>
        `;

        this.showSurveyModal(html);
    }

    /**
     * Continue to next section
     */
    continueSurvey() {
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

        // Update progress bar to show completion
        const totalQuestions = SURVEY_QUESTIONS.metadata.totalQuestions;
        const progressBar = document.getElementById('survey-progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        const progressText = document.getElementById('survey-progress-text');
        if (progressText) {
            progressText.textContent = `${totalQuestions} of ${totalQuestions}`;
        }
    }

    /**
     * Render final comments section
     */
    renderFinalComments() {
        // v3.0 survey doesn't have finalComments, make it optional
        if (SURVEY_QUESTIONS.finalComments) {
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
        return `
            <div class="final-comments">
                <h3>Additional Insights (Optional)</h3>
                <textarea
                    id="final-comments"
                    class="form-textarea"
                    placeholder="Any additional thoughts, examples, or insights you'd like to share?"
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

        // Update progress bar to show completion
        const totalQuestions = SURVEY_QUESTIONS.metadata.totalQuestions;
        const progressBar = document.getElementById('survey-progress-bar');
        if (progressBar) {
            progressBar.style.width = '100%';
        }
        const progressText = document.getElementById('survey-progress-text');
        if (progressText) {
            progressText.textContent = `${totalQuestions} of ${totalQuestions}`;
        }
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
        const totalQuestions = SURVEY_QUESTIONS.metadata.totalQuestions;
        const currentNum = this.getCurrentQuestionNumber();

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
