// early-access.js - Handles the 3-step early access questionnaire

class EarlyAccessApp {
    constructor() {
        this.currentStep = 1;
        this.totalSteps = 3;
        this.responses = {
            email: '',
            financialGoals: '',
            rightsProtection: '',
            idealOutcome: ''
        };

        this.questions = [
            {
                step: 1,
                title: 'Financial Goals',
                question: 'What is your primary goal for optimizing your finances?',
                placeholder: 'e.g., Reduce expenses, maximize savings...',
                field: 'financialGoals'
            },
            {
                step: 2,
                title: 'Rights & Protection',
                question: 'Are there specific areas where you feel your rights need better protection?',
                placeholder: 'e.g., Consumer rights, privacy...',
                field: 'rightsProtection'
            },
            {
                step: 3,
                title: 'Ideal Outcome',
                question: 'What does success look like for you with Yara?',
                placeholder: 'e.g., Save money, peace of mind...',
                field: 'idealOutcome'
            }
        ];
    }

    start() {
        // Get email from the input field
        const emailInput = document.getElementById('early-access-email');
        const email = emailInput.value.trim();

        // Validate email
        if (!email || !this.isValidEmail(email)) {
            alert('Please enter a valid email address');
            return;
        }

        this.responses.email = email;
        this.currentStep = 1;

        // Open the modal and render first question
        document.getElementById('early-access-modal').classList.add('active');
        this.renderStep();
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    renderStep() {
        const question = this.questions[this.currentStep - 1];
        const stepText = document.getElementById('ea-step-text');
        const content = document.getElementById('ea-content');

        stepText.textContent = `STEP ${this.currentStep} OF ${this.totalSteps}`;

        const isLastStep = this.currentStep === this.totalSteps;
        const buttonText = isLastStep ? 'Complete Setup' : 'Next';

        content.innerHTML = `
            <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--text-main);">${question.title}</h2>
            <p style="color: var(--text-muted); margin-bottom: 2rem; font-size: 1.1rem;">${question.question}</p>

            <textarea
                id="ea-answer"
                class="glass-input"
                placeholder="${question.placeholder}"
                rows="4"
                style="width: 100%; min-height: 150px; resize: vertical; padding: 15px; font-size: 1rem; font-family: inherit; margin-bottom: 1.5rem;"
            >${this.responses[question.field] || ''}</textarea>

            <button
                class="btn-primary"
                onclick="earlyAccessApp.handleNext()"
                style="width: 100%; padding: 15px; font-size: 1.1rem;"
            >${buttonText}</button>
        `;

        // Focus on textarea
        setTimeout(() => {
            document.getElementById('ea-answer').focus();
        }, 100);
    }

    handleNext() {
        const question = this.questions[this.currentStep - 1];
        const answer = document.getElementById('ea-answer').value.trim();

        if (!answer) {
            alert('Please provide an answer to continue');
            return;
        }

        // Save the answer
        this.responses[question.field] = answer;

        // If this is the last step, submit
        if (this.currentStep === this.totalSteps) {
            this.submitResponses();
        } else {
            // Move to next step
            this.currentStep++;
            this.renderStep();
        }
    }

    async submitResponses() {
        try {
            // Show loading state
            const content = document.getElementById('ea-content');
            content.innerHTML = `
                <div style="text-align: center; padding: 3rem 0;">
                    <h2 style="font-size: 2rem; margin-bottom: 1rem;">Saving your responses...</h2>
                    <div style="font-size: 3rem;">⏳</div>
                </div>
            `;

            const response = await fetch('/.netlify/functions/submit-early-access', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: this.responses.email,
                    financialGoals: this.responses.financialGoals,
                    rightsProtection: this.responses.rightsProtection,
                    idealOutcome: this.responses.idealOutcome,
                    timestamp: new Date().toISOString()
                })
            });

            const result = await response.json();

            if (response.ok) {
                // Show success message
                content.innerHTML = `
                    <div style="text-align: center; padding: 3rem 0;">
                        <div style="font-size: 4rem; margin-bottom: 1rem;">✨</div>
                        <h2 style="font-size: 2rem; margin-bottom: 1rem; color: var(--primary-blue);">You're All Set!</h2>
                        <p style="color: var(--text-muted); font-size: 1.1rem; margin-bottom: 2rem;">
                            Thank you for sharing your goals with us. We'll notify you when Yara is ready to help you achieve them.
                        </p>
                        <button
                            class="btn-primary"
                            onclick="closeEarlyAccessModal()"
                            style="padding: 15px 40px;"
                        >Close</button>
                    </div>
                `;
            } else {
                throw new Error(result.message || 'Failed to save responses');
            }
        } catch (error) {
            console.error('Error submitting early access:', error);
            alert('There was an error saving your responses. Please try again.');
            this.renderStep(); // Go back to current step
        }
    }

    close() {
        document.getElementById('early-access-modal').classList.remove('active');
        // Reset state
        this.currentStep = 1;
    }
}

// Initialize the app
const earlyAccessApp = new EarlyAccessApp();

// Global functions for onclick handlers
function startEarlyAccess() {
    earlyAccessApp.start();
}

function closeEarlyAccessModal() {
    earlyAccessApp.close();
}
