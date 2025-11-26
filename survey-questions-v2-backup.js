/**
 * Yara Stakeholder Survey Questions
 * Version 2.0 - Prioritized & Streamlined
 *
 * This file contains all 25 survey questions for training Yara's personality
 * and negotiation decision-making framework.
 */

const SURVEY_QUESTIONS = {
    metadata: {
        version: "2.0",
        totalQuestions: 25,
        estimatedTime: "20-25 minutes",
        sections: {
            A: { title: "Core Decision Trees", questions: 15, priority: "high" },
            B: { title: "Personality & Edge Cases", questions: 10, priority: "medium" }
        }
    },

    sectionA: {
        title: "SECTION A: Core Decision Trees",
        subtitle: "These questions create the foundation for YARA's training data",
        questions: [
            {
                id: "q1",
                title: "Alert Urgency & Recommendation Strength (Billing Errors)",
                context: "YARA monitors user's bank transactions via Plaid and detects billing errors. YARA always requires user approval before taking action (human-in-the-loop), but how urgently should YARA alert the user?",
                type: "multi-scenario",
                scenarios: [
                    {
                        id: "scenarioA",
                        description: "Spotify charged $9.99 twice on same day (duplicate charge)",
                        fields: [
                            {
                                name: "alertTiming",
                                label: "Alert timing:",
                                type: "select",
                                options: [
                                    "Immediate Push Notification",
                                    "End-of-Day Digest",
                                    "Weekly Summary"
                                ]
                            },
                            {
                                name: "recommendationStrength",
                                label: "Recommendation strength:",
                                type: "select",
                                options: [
                                    "Directive",
                                    "Strong Recommendation",
                                    "Options-Based"
                                ]
                            }
                        ]
                    },
                    {
                        id: "scenarioB",
                        description: "AT&T charging $15/month 'modem rental' for 6 months, but YARA detects user bought own modem on Amazon 8 months ago (total: $90 overcharge)",
                        fields: [
                            {
                                name: "alertTiming",
                                label: "Alert timing:",
                                type: "select",
                                options: [
                                    "Immediate Push Notification",
                                    "End-of-Day Digest",
                                    "Weekly Summary"
                                ]
                            },
                            {
                                name: "recommendationStrength",
                                label: "Recommendation strength:",
                                type: "select",
                                options: [
                                    "Directive",
                                    "Strong Recommendation",
                                    "Options-Based"
                                ]
                            }
                        ]
                    },
                    {
                        id: "scenarioC",
                        description: "Comcast bill increased from $65 to $82/month with no notice to user",
                        fields: [
                            {
                                name: "alertTiming",
                                label: "Alert timing:",
                                type: "select",
                                options: [
                                    "Immediate Push Notification",
                                    "End-of-Day Digest",
                                    "Weekly Summary"
                                ]
                            },
                            {
                                name: "recommendationStrength",
                                label: "Recommendation strength:",
                                type: "select",
                                options: [
                                    "Directive",
                                    "Strong Recommendation",
                                    "Options-Based"
                                ]
                            }
                        ]
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why? What's your decision framework?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "thresholdImmediate",
                        label: "Immediate alert for clear errors above: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "thresholdDaily",
                        label: "Daily digest for errors between: $",
                        type: "number",
                        placeholder: "Min amount"
                    },
                    {
                        name: "thresholdDailyMax",
                        label: "to $",
                        type: "number",
                        placeholder: "Max amount"
                    }
                ]
            },
            {
                id: "q2",
                title: "Escalation Timing (Multiple Denials)",
                context: "User's health insurance (UnitedHealthcare) has denied the same physical therapy claim 3 times with different reasons each time:\n1. 'No referral' - user submitted it\n2. 'Not pre-authorized' - user showed it was\n3. 'Not medically necessary' - current denial\n\nUser has appealed twice internally. User is exhausted and in pain. Medical bills: $1,200 out-of-pocket so far.",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Try one more internal appeal with comprehensive letter addressing all three reasons"
                    },
                    {
                        id: "optionB",
                        text: "File external review immediately (legally binding, independent medical expert)"
                    },
                    {
                        id: "optionC",
                        text: "File external review AND state insurance commissioner complaint simultaneously (bad faith)"
                    },
                    {
                        id: "optionD",
                        text: "Contact patient advocacy nonprofit + media (public pressure tactic)"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "escalationRule",
                        label: "General rule: After how many denials with 'moving goalposts' should YARA escalate to external review?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q3",
                title: "Negotiation vs Switching (Loyalty Question)",
                context: "User has been with Verizon Wireless for 15 years, paying $110/month. T-Mobile offers similar service for $70/month (40% cheaper).\n\nUser: 'Should I switch or try negotiating with Verizon?'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Negotiate with Verizon first (leverage loyalty, 15 years matters)"
                    },
                    {
                        id: "optionB",
                        text: "Switch immediately (Verizon isn't rewarding loyalty, you're overpaying 57%)"
                    },
                    {
                        id: "optionC",
                        text: "Present both options, let user choose based on priority (max savings vs minimal hassle)"
                    },
                    {
                        id: "optionD",
                        text: "Call Verizon and threaten to switch—be willing to actually switch if they don't match"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "loyaltyPrinciple",
                        label: "General principle: When companies don't reward loyalty, should YARA emphasize 'they're taking advantage of your loyalty' to motivate switching, or stay neutral?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q4",
                title: "When to Recommend Lawyers (Personal Injury)",
                context: "User hit by another driver (100% at fault). Whiplash, soft tissue injuries. Medical bills: $8,500. Lost wages: $2,200. Other party's insurance (Geico) offered $12,000 settlement.\n\nUser still having neck pain 4 months post-accident, doctor recommends 8 more PT sessions.",
                type: "single-choice",
                question: "Should YARA recommend getting a lawyer?",
                options: [
                    {
                        id: "optionA",
                        text: "DIY negotiation (counteroffer $20K-25K using multiplier formula)"
                    },
                    {
                        id: "optionB",
                        text: "Lawyer consultation (free, likely gets $18K-22K after 33% fee)"
                    },
                    {
                        id: "optionC",
                        text: "Don't settle yet - still treating! Never settle while medical treatment ongoing"
                    },
                    {
                        id: "optionD",
                        text: "Accept if user wants to be done ($1,300 above out-of-pocket costs)"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "lawyerThreshold",
                        label: "General thresholds for lawyer recommendations in personal injury:",
                        type: "textarea",
                        placeholder: "Your framework..."
                    }
                ]
            },
            {
                id: "q5",
                title: "Small Claims Court Threshold",
                context: "User has exhausted all attempts with Comcast to get $600 refund for billing overcharges (8 months of errors). User has documentation. Comcast refuses. FCC complaint filed, no resolution.\n\nUser: 'Should I take them to small claims court or just give up?'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Yes, file small claims. $600 > 'give up' threshold"
                    },
                    {
                        id: "optionB",
                        text: "Conditional—depends on documentation strength"
                    },
                    {
                        id: "optionC",
                        text: "Try executive escalation first, mention small claims as threat"
                    },
                    {
                        id: "optionD",
                        text: "Honest cost-benefit: ROI is marginal. Only if doing it on principle"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "threshold",
                        label: "At what dollar amount should YARA recommend small claims court?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q6",
                title: "Firmness with Retention Tactics (SiriusXM)",
                context: "User canceling SiriusXM ($25/month, doesn't use it). Agent offers:\n1. 50% discount - declined\n2. 60% discount + 3 free months - declined\n3. Agent asks to transfer to loyalty team for 'even better offer'\n\nUser: 'They keep offering discounts but I don't use it. Should I take a deal or keep saying no?'",
                type: "single-choice",
                question: "How should YARA advise?",
                options: [
                    {
                        id: "optionA",
                        text: "Stay firm. Say 'No thank you, please proceed with cancellation'"
                    },
                    {
                        id: "optionB",
                        text: "Depends—will you use it at $12/month? If yes, good deal"
                    },
                    {
                        id: "optionC",
                        text: "Say 'I'll think about it.' Hang up. Call next day"
                    },
                    {
                        id: "optionD",
                        text: "Take the transfer, hear the best offer, then decide"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "transferAdvice",
                        label: "On the loyalty transfer offer, should YARA warn this is another retention layer?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q7",
                title: "Proactive Unused Subscription Alert",
                context: "YARA detects user paying $35/month for LA Fitness but hasn't used it in 4 months (no gym check-ins, $140 spent). User hasn't mentioned anything.",
                type: "single-choice",
                question: "Should YARA proactively suggest cancellation?",
                options: [
                    {
                        id: "optionA",
                        text: "Direct: 'You haven't used LA Fitness in 4 months. Want me to cancel it?'"
                    },
                    {
                        id: "optionB",
                        text: "Inquiry: 'You haven't used LA Fitness in 4 months. Planning to use it soon?'"
                    },
                    {
                        id: "optionC",
                        text: "Soft Nudge: 'Spending insight: No check-ins in 4 months. FYI'"
                    },
                    {
                        id: "optionD",
                        text: "Wait until 6 months of non-use"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "defaultApproach",
                        label: "When identifying unused subscriptions, should YARA default to 'Let's cancel this' or 'Just checking'?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q8",
                title: "Settlement Pressure Tactics (Insurance Adjuster)",
                context: "User's home damaged in storm. State Farm adjuster assessed $6,500 damage and is pushing user to sign settlement TODAY. User hasn't gotten contractor estimates.\n\nAdjuster: 'If you don't sign today, I'll have to re-open the claim and process starts over. Could take another 30 days.'",
                type: "single-choice",
                question: "How strongly should YARA advise against signing?",
                options: [
                    {
                        id: "optionA",
                        text: "Strong No: Do NOT sign. This is a pressure tactic"
                    },
                    {
                        id: "optionB",
                        text: "Conditional: For simple damage, OK. For complex, get quotes"
                    },
                    {
                        id: "optionC",
                        text: "Educate + Caution: Get one contractor quote to verify"
                    },
                    {
                        id: "optionD",
                        text: "Firm Boundary: Tell adjuster you need estimates first"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "pressureTactic",
                        label: "On the adjuster's threat, is this legitimate or a pressure tactic?",
                        type: "text",
                        placeholder: "Your assessment..."
                    }
                ]
            },
            {
                id: "q9",
                title: "YARA Personality - Multiple Denials (Tone)",
                context: "User's insurance denied MRI doctor ordered for suspected spinal tumor. Denial reason: 'not medically necessary.' User terrified, can't afford $2,500.\n\nUser: 'They're saying it's not medically necessary but my doctor says I need it to rule out a tumor. I'm scared and can't pay $2,500. What do I do?'",
                type: "ranking",
                question: "Rank these response versions (1 = best, 3 = worst):",
                versions: [
                    {
                        id: "versionA",
                        label: "Process-Oriented",
                        text: "This is an internal appeal situation. Process: (1) Request written denial, (2) Doctor writes letter of medical necessity, (3) Submit internal appeal within 180 days..."
                    },
                    {
                        id: "versionB",
                        label: "Advocacy/Urgent",
                        text: "This is exactly why insurance companies frustrate doctors—second-guessing medical judgment to save money. Here's what we're doing: I'm helping your doctor draft a letter..."
                    },
                    {
                        id: "versionC",
                        label: "Empowering/Clear",
                        text: "Take a breath—we can fight this. Insurance denials for 'medical necessity' are common and often overturned (60-70% with appeals). Your doctor's support is your weapon..."
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "What appeals to you about your top choice?",
                        type: "textarea",
                        placeholder: "Explain your ranking..."
                    },
                    {
                        name: "empathy",
                        label: "Should YARA acknowledge the user's fear about the medical condition, or stay focused on the insurance fight?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q10",
                title: "Handling AI Inference Uncertainty",
                context: "YARA analyzes AT&T bills and sees $15/month 'Equipment Rental Fee' for 6 months. Cross-referencing Amazon purchase history, YARA sees user bought an ARRIS modem 8 months ago.\n\nYARA's inference: This is a billing error. But what if wrong? Maybe user is renting different equipment.",
                type: "single-choice",
                question: "How should YARA alert the user?",
                options: [
                    {
                        id: "optionA",
                        text: "Verify First: 'Are you renting other equipment, or is this an error?'"
                    },
                    {
                        id: "optionB",
                        text: "High-Confidence: 'I found a billing error. Tap to approve and I'll get your $90 credit'"
                    },
                    {
                        id: "optionC",
                        text: "Present Data: 'I noticed these two things. Does this look like an error to you?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "inferenceFramework",
                        label: "General principle for AI inferences: How should YARA frame high vs medium confidence findings?",
                        type: "textarea",
                        placeholder: "Your framework..."
                    }
                ]
            },
            {
                id: "q11",
                title: "Spending Spike - Legitimate but Negotiable?",
                context: "YARA detects user's AT&T bill spiked to $245 (usually $85). Extra $160 is 'International Roaming' from Mexico trip. Appears legitimate.",
                type: "single-choice",
                question: "What should YARA do?",
                options: [
                    {
                        id: "optionA",
                        text: "Investigate: 'Did you travel? Want me to dispute if unauthorized?'"
                    },
                    {
                        id: "optionB",
                        text: "Contextualize: 'Mexico trip cost $160. If AT&T didn't warn you, we can try negotiating'"
                    },
                    {
                        id: "optionC",
                        text: "Informational: 'FYI: Bill was $245 due to Mexico roaming'"
                    },
                    {
                        id: "optionD",
                        text: "Educational: 'Bill spiked due to roaming. For future, I can help set up international plans'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "yaraRole",
                        label: "For user-behavior-driven spending spikes, what's YARA's role?",
                        type: "textarea",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q12",
                title: "Prioritization Framework (Multiple Opportunities)",
                context: "YARA identifies opportunities:\n- Subscriptions: $32/month savings, 5 min to cancel\n- Telecom: $27/month savings, 30-min call\n- Insurance: $30-50/month savings, 2-3 hours work\n\nUser: 'Where should I start? This is overwhelming.'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Biggest Impact First: Start with subscriptions, then telecom"
                    },
                    {
                        id: "optionB",
                        text: "Easiest First: Quick wins to build momentum"
                    },
                    {
                        id: "optionC",
                        text: "User Choice: Present all with effort estimates"
                    },
                    {
                        id: "optionD",
                        text: "Effort-to-Savings Ratio: Optimize efficiency"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "framework",
                        label: "General prioritization framework when presenting multiple opportunities:",
                        type: "textarea",
                        placeholder: "Your framework..."
                    }
                ]
            },
            {
                id: "q13",
                title: "Ethical Boundaries",
                context: "User asks: 'I bought a $300 online course but didn't like it. They have a no-refund policy. Can you call my credit card and tell them I never authorized the charge?'\n\nThis is requesting a false fraud claim.",
                type: "single-choice",
                question: "How should YARA respond?",
                options: [
                    {
                        id: "optionA",
                        text: "Firm No: 'I can't do that. Filing a false fraud claim is illegal'"
                    },
                    {
                        id: "optionB",
                        text: "Redirect: 'I can't file false fraud, but let's look at legitimate options'"
                    },
                    {
                        id: "optionC",
                        text: "Educate: 'False fraud claims can result in criminal charges'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your preference..."
                    },
                    {
                        name: "firingPolicy",
                        label: "At what point should YARA 'fire' a user for requesting illegal/unethical actions?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q14",
                title: "Context Calibration - User Emotion",
                context: "Bank of America hasn't issued $850 fraud credit after 12 days (violates Reg E). User is getting late fees.\n\nUser A (Calm): 'It's been 2 weeks. What can I do?'\nUser B (Distressed): 'It's been 2 weeks, I'm getting late fees, I have $12 in my account, I'm panicking. What do I do?'",
                type: "open-ended",
                question: "Should YARA's response change based on emotional state?",
                fields: [
                    {
                        name: "shouldChange",
                        label: "Should responses differ?",
                        type: "radio",
                        options: ["Yes", "No"]
                    },
                    {
                        name: "userAResponse",
                        label: "If Yes, how should YARA respond to User A (calm)?",
                        type: "textarea",
                        placeholder: "Your approach..."
                    },
                    {
                        name: "userBResponse",
                        label: "If Yes, how should YARA respond to User B (distressed)?",
                        type: "textarea",
                        placeholder: "Your approach..."
                    },
                    {
                        name: "principle",
                        label: "General principle: How much should user emotion affect YARA's tone/approach?",
                        type: "textarea",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q15",
                title: "When to Recommend Public Adjusters",
                context: "User's roof damaged by hail storm, $8,000 claimed. Allstate denied citing 'pre-existing wear.' User has photos + weather reports.\n\nPublic adjuster: 10% fee ($800), often increases settlements 50-80%.",
                type: "single-choice",
                question: "When should YARA recommend a public adjuster?",
                options: [
                    {
                        id: "optionA",
                        text: "Immediately: Recommend PA now alongside internal appeal"
                    },
                    {
                        id: "optionB",
                        text: "After Internal Appeal Fails: Try DIY first"
                    },
                    {
                        id: "optionC",
                        text: "Threshold-Based: Only for claims $25K-50K+"
                    },
                    {
                        id: "optionD",
                        text: "User's Financial Situation: Ask if they can afford 10% fee"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "threshold",
                        label: "At what claim amount does a public adjuster make sense?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            }
        ]
    },

    sectionB: {
        title: "SECTION B: Personality & Edge Cases",
        subtitle: "These questions refine YARA's voice and handle uncommon situations",
        questions: [
            {
                id: "q16",
                title: "Tone - Balance Billing (Emergency Surgery)",
                context: "User got $4,800 surprise bill from out-of-network anesthesiologist during emergency surgery. User is stressed and confused.\n\nUser: 'I just got a $4,800 bill from an anesthesiologist I never even met. My insurance covered the surgery but not this. I can't afford this.'",
                type: "ranking",
                question: "Rank these response versions (1 = best, 3 = worst):",
                versions: [
                    {
                        id: "versionA",
                        label: "Regulatory/Technical",
                        text: "This appears to be balance billing. Under the No Surprises Act effective January 2022, you're protected..."
                    },
                    {
                        id: "versionB",
                        label: "Empathetic/Advocacy",
                        text: "This is exactly the kind of surprise billing the No Surprises Act was designed to stop. You shouldn't be paying this..."
                    },
                    {
                        id: "versionC",
                        label: "Action-Oriented/Directive",
                        text: "Don't pay this bill yet. This violates the No Surprises Act. First, I'm sending you a template dispute letter..."
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why do you prefer your top choice?",
                        type: "textarea",
                        placeholder: "Explain..."
                    },
                    {
                        name: "contextChange",
                        label: "Would your ranking change if bill was $600 instead of $4,800, or if user was crying vs calm?",
                        type: "textarea",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q17",
                title: "Edge Case - Zelle Scam",
                context: "User scammed via Zelle. Caller pretended to be BofA fraud dept, convinced user to send $800. User realized scam 2 hours later. Bank says 'you authorized it, not fraud under Reg E.'\n\nUser: 'I got scammed out of $800 via Zelle. Is there anything I can do?'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Reality Check: Bank is correct, limited recourse"
                    },
                    {
                        id: "optionB",
                        text: "Push the Bank: File CFPB complaint, escalate for reputational pressure"
                    },
                    {
                        id: "optionC",
                        text: "Multi-Pronged: Try everything (police, CFPB, recipient's bank, Zelle)"
                    },
                    {
                        id: "optionD",
                        text: "Honest + Supportive: Be upfront about low odds but push anyway"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "lowProbability",
                        label: "In low-probability cases, should YARA be upfront about odds or pursue every angle?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q18",
                title: "Edge Case - Diminished Value Claim",
                context: "User's car (2022 Camry, worth $28K) was in not-at-fault accident. Insurance paid repairs ($5,800). Car repaired but has accident history, reducing resale value.\n\nUser: 'My car's been repaired but I know it's worth less now. Can I get compensated?'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Educational: Explain diminished value claims and process"
                    },
                    {
                        id: "optionB",
                        text: "Action-Oriented: File claim using 17c formula"
                    },
                    {
                        id: "optionC",
                        text: "Tactical: Calculate first, only pay for appraisal if denied"
                    },
                    {
                        id: "optionD",
                        text: "Reality Check: Explain challenges and no guarantee"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "proactive",
                        label: "Should YARA proactively inform users about diminished value when spotting an accident?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q19",
                title: "Edge Case - Experimental Treatment Denial",
                context: "User has rare condition. Doctor recommends cutting-edge treatment ($45K). Insurance denied as 'experimental.' No FDA-approved alternatives. User desperate.\n\nUser: 'Insurance denied the only treatment for my condition. I can't afford $45K. Am I out of options?'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Appeals Process: Internal + external review, check clinical trials"
                    },
                    {
                        id: "optionB",
                        text: "Aggressive + Off-Label: Check if FDA-approved for other conditions"
                    },
                    {
                        id: "optionC",
                        text: "Realistic + Compassionate: Appeals worth trying, but explore patient assistance, fundraising"
                    },
                    {
                        id: "optionD",
                        text: "Escalation + Media: Contact advocacy nonprofits, media, legislators"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "hopeVsRealism",
                        label: "In high-stakes, low-probability cases, should YARA be honest about odds or focus on hope?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q20",
                title: "User Analytical Question (Data-Driven)",
                context: "User asks: 'Why is my telecom spending up 20% vs last year?'\n\nYARA has data:\n- AT&T: $85/month (unchanged)\n- Comcast: $60 → $82/month (8 months ago, +$22)\n- Netflix: $10 → $16 (6 months ago, +$6)\n- Disney+ added 4 months ago (+$14)",
                type: "single-choice",
                question: "How should YARA answer?",
                options: [
                    {
                        id: "optionA",
                        text: "Data Breakdown: List the increases"
                    },
                    {
                        id: "optionB",
                        text: "Data + Context: Breakdown + note Comcast increase seems excessive"
                    },
                    {
                        id: "optionC",
                        text: "Data + Action: Breakdown + 'Here's how to fix it'"
                    },
                    {
                        id: "optionD",
                        text: "Visual + Prioritized: Chart + prioritized opportunities"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "analyticalApproach",
                        label: "When users ask analytical questions, should YARA just answer, provide context, suggest actions, or take action?",
                        type: "textarea",
                        placeholder: "Your framework..."
                    }
                ]
            },
            {
                id: "q21",
                title: "Auto Claim - Lowball Offer Response",
                context: "User's car totaled (not at fault). 2019 Honda Civic. State Farm offered $14,200. User found 5 comparable vehicles: $17,500-18,500.\n\nUser: 'State Farm is lowballing me. What should I do?'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Analytical: Explain comp analysis, draft counteroffer letter"
                    },
                    {
                        id: "optionB",
                        text: "Advocacy: Call State Farm, demand $18K, invoke appraisal clause"
                    },
                    {
                        id: "optionC",
                        text: "Educational: Explain strategy, walk through negotiation process"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "framing",
                        label: "Should YARA frame this as 'State Farm is wronging you' or 'This is normal negotiation'?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q22",
                title: "Adobe Dark Pattern - Termination Fee",
                context: "User canceling Adobe Creative Cloud. Adobe wants $220 early termination fee (50% of 8 months). User angry, feels trapped.\n\nUser: 'I can't believe Adobe is charging $220 just to cancel! I thought I was month-to-month. I can't afford this.'",
                type: "single-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "optionA",
                        text: "Problem-Solver: Explain plan-switching workaround (~$90 vs $220)"
                    },
                    {
                        id: "optionB",
                        text: "Validation + Action: Call out dark pattern, provide workaround + FTC complaint"
                    },
                    {
                        id: "optionC",
                        text: "Multi-Option: Present all options (pay, workaround, request waiver, dispute)"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your choice..."
                    },
                    {
                        name: "validation",
                        label: "Should YARA validate frustration and call out Adobe's practices, or stay neutral?",
                        type: "text",
                        placeholder: "Your answer..."
                    }
                ]
            },
            {
                id: "q23",
                title: "Tone Calibration - Professional vs Conversational",
                context: "User's credit card dispute was denied by bank.",
                type: "scale-rating",
                question: "Rate each version (1=too formal, 5=too casual, 3=just right):",
                versions: [
                    {
                        id: "versionA",
                        text: "Your dispute was denied. Per Regulation Z, you have the right to request investigation documents..."
                    },
                    {
                        id: "versionB",
                        text: "Your dispute was denied, which sucks. But you're not done yet—request the docs and file a CFPB complaint..."
                    },
                    {
                        id: "versionC",
                        text: "They denied your dispute. Here's what we're doing: (1) Request investigation documents, (2) File CFPB complaint..."
                    }
                ],
                followUp: [
                    {
                        name: "idealTone",
                        label: "Describe your ideal YARA tone in 2-3 sentences:",
                        type: "textarea",
                        placeholder: "Your vision for YARA's tone..."
                    }
                ]
            },
            {
                id: "q24",
                title: "YARA's Recommendation Strength",
                context: "YARA always requires user approval before taking action (human-in-the-loop). But how directive should recommendations be?",
                type: "open-ended",
                question: "Define your framework for recommendation strength:",
                fields: [
                    {
                        name: "directive",
                        label: "When should YARA be DIRECTIVE ('Here's what we're doing. Tap to approve.')?",
                        type: "textarea",
                        placeholder: "Your framework..."
                    },
                    {
                        name: "options",
                        label: "When should YARA present OPTIONS ('Here are 3 approaches. Which do you prefer?')?",
                        type: "textarea",
                        placeholder: "Your framework..."
                    },
                    {
                        name: "askFirst",
                        label: "When should YARA ASK USER FIRST ('I need more context before I can recommend.')?",
                        type: "textarea",
                        placeholder: "Your framework..."
                    }
                ]
            },
            {
                id: "q25",
                title: "Renewal Alert Timing",
                context: "User's Adobe Creative Cloud ($54.99/month) auto-renews in X days (annual renewal at $659.88). User hasn't used Adobe in 6 months.",
                type: "open-ended",
                question: "How many days in advance should YARA alert?",
                fields: [
                    {
                        name: "days",
                        label: "Alert timing (days):",
                        type: "number",
                        placeholder: "Number of days"
                    },
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "factors",
                        label: "Does timing depend on subscription amount or other factors?",
                        type: "textarea",
                        placeholder: "Your framework..."
                    }
                ]
            }
        ]
    },

    finalComments: {
        title: "Additional Insights",
        question: "Thank you for your invaluable insights! If you have any final thoughts, edge cases, or 'war stories' that didn't fit into these scenarios, please share below:",
        type: "textarea",
        placeholder: "Share any additional comments or experiences..."
    }
};
