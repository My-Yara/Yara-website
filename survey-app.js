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

        // Test mode: Enable with ?test=true in URL
        this.testMode = new URLSearchParams(window.location.search).get('test') === 'true';

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

        // Store credentials for subsequent API calls
        this.adminEmail = email;
        this.adminPassword = password;

        // Clear previous errors
        if (errorEl) errorEl.textContent = '';

        // Disable button during request
        submitBtn.disabled = true;
        submitBtn.textContent = 'Authenticating...';

        try {
            // Call authentication function
            const response = await fetch('/.netlify/functions/authenticate', {
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

                // Show Admin Dashboard (Waitlist Management)
                setTimeout(() => {
                    this.showAdminDashboard();
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
     * Show Admin Dashboard for Waitlist Management
     */
    async showAdminDashboard() {
        const dashboardHTML = `
            <div class="admin-dashboard" style="text-align: left; max-width: 900px; margin: 0 auto;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 25px; border-bottom: 2px solid #f0f0f0; padding-bottom: 15px;">
                    <h2 style="margin: 0; color: var(--primary-accent);">Waitlist Management</h2>
                    <div style="display: flex; gap: 10px;">
                        <button class="btn-tertiary" onclick="surveyApp.startSurvey()" style="padding: 8px 15px; font-size: 0.9rem;">Take Survey</button>
                        <button class="btn-secondary" onclick="location.reload()" style="padding: 8px 15px; font-size: 0.9rem;">Logout</button>
                    </div>
                </div>

                <div id="waitlist-container">
                    <div style="text-align: center; padding: 40px;">
                        <div style="font-size: 2rem; margin-bottom: 10px;">⏳</div>
                        <p>Loading waitlist signups...</p>
                    </div>
                </div>
            </div>
        `;

        this.showSurveyModal(dashboardHTML);
        this.fetchWaitlist();
    }

    /**
     * Fetch waitlist data from the server
     */
    async fetchWaitlist() {
        const container = document.getElementById('waitlist-container');
        
        try {
            const response = await fetch('/.netlify/functions/list-waitlist', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: this.adminEmail,
                    password: this.adminPassword
                })
            });

            if (!response.ok) throw new Error('Failed to fetch waitlist');

            const waitlist = await response.json();
            this.renderWaitlist(waitlist);

        } catch (error) {
            console.error('Error fetching waitlist:', error);
            container.innerHTML = `
                <div style="background: #fff5f5; border: 1px solid #feb2b2; padding: 20px; border-radius: 12px; color: #c53030;">
                    <p><strong>Error:</strong> ${error.message}</p>
                    <button class="btn-primary" onclick="surveyApp.fetchWaitlist()" style="margin-top: 10px;">Retry</button>
                </div>
            `;
        }
    }

    /**
     * Render the waitlist table
     */
    renderWaitlist(waitlist) {
        const container = document.getElementById('waitlist-container');
        
        if (waitlist.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 40px; color: #718096;">No waitlist signups found.</p>';
            return;
        }

        let tableHTML = `
            <div style="overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                    <thead>
                        <tr style="background: #f7fafc; text-align: left;">
                            <th style="padding: 12px; border-bottom: 2px solid #edf2f7;">User / Date</th>
                            <th style="padding: 12px; border-bottom: 2px solid #edf2f7;">Details</th>
                            <th style="padding: 12px; border-bottom: 2px solid #edf2f7;">Status</th>
                            <th style="padding: 12px; border-bottom: 2px solid #edf2f7;">Action</th>
                        </tr>
                    </thead>
                    <tbody>
        `;

        waitlist.forEach((entry, index) => {
            const date = new Date(entry.timestamp).toLocaleDateString();
            const isApproved = entry.status === 'approved';
            
            tableHTML += `
                <tr style="border-bottom: 1px solid #edf2f7;">
                    <td style="padding: 12px;">
                        <div style="font-weight: 600; color: var(--text-main);">${entry.email}</div>
                        <div style="font-size: 0.75rem; color: #a0aec0;">${date} • IP: ${entry.ipAddress || 'Unknown'}</div>
                    </td>
                    <td style="padding: 12px;">
                        <div style="max-width: 300px; font-size: 0.8rem; color: #4a5568;">
                            <strong>Goal:</strong> ${this.truncate(entry.financialGoals, 60)}
                        </div>
                    </td>
                    <td style="padding: 12px;">
                        <span style="display: inline-block; padding: 2px 8px; border-radius: 12px; font-size: 0.75rem; font-weight: 600; 
                            ${isApproved ? 'background: #c6f6d5; color: #22543d;' : 'background: #ebf4ff; color: #2a4365;'}">
                            ${isApproved ? 'Approved' : 'Pending'}
                        </span>
                    </td>
                    <td style="padding: 12px;">
                        ${isApproved ? 
                            '<span style="color: #48bb78; font-size: 1.2rem;">✓</span>' : 
                            `<button id="btn-approve-${index}" class="btn-primary" 
                                onclick="surveyApp.approveTester('${entry.email}', '${entry.filename}', '${entry.sha}', ${index})" 
                                style="padding: 6px 12px; font-size: 0.8rem;">Approve</button>`
                        }
                    </td>
                </tr>
            `;
        });

        tableHTML += `</tbody></table></div>`;
        container.innerHTML = tableHTML;
    }

    /**
     * Approve a tester
     */
    async approveTester(userEmail, filename, sha, index) {
        const btn = document.getElementById(`btn-approve-${index}`);
        if (!btn) return;

        if (!confirm(`Approve ${userEmail} for TestFlight beta?`)) return;

        btn.disabled = true;
        btn.textContent = 'Approving...';

        try {
            const response = await fetch('/.netlify/functions/approve-tester', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    adminEmail: this.adminEmail,
                    adminPassword: this.adminPassword,
                    userEmail: userEmail,
                    filename: filename,
                    sha: sha
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Refresh list to show updated status
                await this.fetchWaitlist();
                alert(`Successfully approved ${userEmail}! They will receive a TestFlight invite from Apple.`);
            } else {
                throw new Error(result.message || 'Approval failed');
            }
        } catch (error) {
            console.error('Error approving tester:', error);
            alert(`Error: ${error.message}`);
            btn.disabled = false;
            btn.textContent = 'Approve';
        }
    }

    truncate(str, length) {
        if (!str) return '';
        return str.length > length ? str.substring(0, length) + '...' : str;
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
                ${this.testMode ? '<div style="background: #ff6b00; color: white; padding: 10px; border-radius: 8px; margin-bottom: 20px; font-weight: bold;">🧪 TEST MODE ACTIVE - Auto-fill enabled</div>' : ''}
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
                ${this.testMode ? '<div style="background: #ff6b00; color: white; padding: 5px 10px; border-radius: 5px; margin-bottom: 10px; font-size: 0.85rem; font-weight: bold;">🧪 TEST MODE</div>' : ''}
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
                ${this.testMode ?
                    `<button type="button" class="btn-primary" onclick="surveyApp.autoFillAndNext()" style="background: #ff6b00;">🧪 Auto-Fill & Next</button>` :
                    `<button type="submit" class="btn-primary">Next →</button>`}
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
                    <h3 class="scenario-title">${scenario.label || `Scenario ${String.fromCharCode(65 + index)}`}</h3>

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
     * Auto-fill current question with test data (TEST MODE ONLY)
     */
    autoFillAndNext() {
        if (!this.testMode) return;

        const questions = this.getCurrentSectionQuestions();
        const question = questions[this.currentQuestionIndex];
        const questionData = {};

        // Generate test data based on question type
        switch (question.type) {
            case 'multiple-choice':
            case 'single-choice':
                questionData.choice = question.options[0].id || 'A';
                break;

            case 'ranking':
                const items = question.capabilities || question.insights || [];
                items.forEach((item, index) => {
                    questionData[`rank_${item.id}`] = (index + 1).toString();
                });
                break;

            case 'multi-scenario':
                question.scenarios.forEach(scenario => {
                    scenario.fields.forEach(field => {
                        const fieldName = `${scenario.id}_${field.name}`;
                        if (field.type === 'select') {
                            questionData[fieldName] = field.options[0];
                        } else if (field.type === 'textarea') {
                            questionData[fieldName] = 'Test response for automated testing';
                        } else if (field.type === 'number') {
                            questionData[fieldName] = '50';
                        }
                    });
                });
                break;

            case 'scale-rating':
                question.versions.forEach(version => {
                    questionData[`rating_${version.id}`] = '3';
                });
                break;

            case 'open-ended':
                // Open-ended questions have no main input, just follow-ups
                break;
        }

        // Fill in follow-up questions
        if (question.followUp) {
            question.followUp.forEach(followUp => {
                if (followUp.type === 'select') {
                    questionData[followUp.name] = followUp.options[0];
                } else if (followUp.type === 'textarea') {
                    questionData[followUp.name] = 'Test response for automated testing';
                } else if (followUp.type === 'number') {
                    questionData[followUp.name] = '100';
                } else if (followUp.type === 'text') {
                    questionData[followUp.name] = 'Test text';
                }
            });
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
        const questions = this.getCurrentSectionQuestions();
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
     * Calculate remaining time for sections still to complete
     * Includes the section you're about to start
     */
    calculateRemainingTime() {
        const sections = SURVEY_QUESTIONS.metadata.sections;
        let remainingMinutes = 0;

        // Calculate time for remaining sections (including current section we're starting)
        if (this.currentSection === 'strategic') {
            // Sections A, B, C remain (strategic is separate, not counted in main 26 min)
            remainingMinutes = parseInt(sections.A.time) +
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

        // Auto-advance in test mode
        if (this.testMode) {
            setTimeout(() => {
                this.continueSurvey();
            }, 500);
        }
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
            const response = await fetch('/.netlify/functions/submit-response', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(surveySubmission)
            });

            let result;
            try {
                result = await response.json();
            } catch (parseError) {
                throw new Error(`Server returned invalid response. Status: ${response.status}`);
            }

            if (response.ok) {
                // Clear saved progress
                localStorage.removeItem(`yara_survey_${this.currentUser}`);

                // Show success
                this.showSubmissionSuccess();
            } else {
                const errorMessage = result.message || result.details || 'Unknown error occurred';
                throw new Error(`Submission failed: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Submission error:', error);

            // Show detailed error to user
            const errorDiv = document.createElement('div');
            errorDiv.style.cssText = 'background: #fee; border: 1px solid #f88; padding: 15px; border-radius: 8px; margin-top: 20px; color: #c00;';
            errorDiv.innerHTML = `
                <h4 style="margin: 0 0 10px 0;">❌ Submission Failed</h4>
                <p style="margin: 0; font-size: 0.9rem;">${error.message}</p>
                <p style="margin: 10px 0 0 0; font-size: 0.85rem;">Please try again or contact support if the issue persists.</p>
            `;

            const modal = document.querySelector('.survey-complete');
            if (modal) {
                modal.appendChild(errorDiv);
            }

            if (submitBtn) {
                submitBtn.disabled = false;
                submitBtn.textContent = 'Retry Submit';
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
