/**
 * Yara Stakeholder Survey Questions
 * Version 3.0 - Strategic Decisions + Real-Time Negotiation
 *
 * This file contains all 32 survey questions for training Yara's personality
 * and real-time negotiation framework.
 */

const SURVEY_QUESTIONS = {
    metadata: {
        version: "3.0",
        totalQuestions: 32,
        estimatedTime: "35-45 minutes",
        sections: {
            strategic: { title: "Strategic Feature Prioritization", questions: 2, time: "5 minutes", priority: "critical" },
            A: { title: "Core Decisions", questions: 10, time: "15 minutes", priority: "high" },
            B: { title: "Tactical Skills", questions: 10, time: "10 minutes", priority: "medium" },
            C: { title: "Refinements & Edge Cases", questions: 10, time: "10 minutes", priority: "low" }
        }
    },

    strategicPrioritization: {
        title: "STRATEGIC FEATURE PRIORITIZATION (For Investors & Leadership)",
        subtitle: "These 2 questions determine YARA's product roadmap and AI model training allocation",
        questions: [
            {
                id: "sf1",
                title: "Core Capability Ranking",
                context: "Rank YARA's 6 core capabilities by importance to product-market fit (1 = most critical to success, 6 = least critical).",
                type: "ranking",
                capabilities: [
                    {
                        id: "live3way",
                        name: "Live 3-Way Call Negotiation",
                        description: "User + YARA + Company CSR on same call. YARA negotiates in real-time (what to say, when to escalate, how to counter offers) while user listens. User approves all settlements."
                    },
                    {
                        id: "ivr",
                        name: "IVR Navigation (Automated Phone Menu Navigation)",
                        description: "YARA auto-navigates phone menus ('Press 1 for billing...') to reach human agents, saving users 5-15 minutes of hold time and menu frustration."
                    },
                    {
                        id: "proactive",
                        name: "Proactive Billing Error Detection",
                        description: "YARA monitors bank transactions via Plaid, auto-detects billing errors (overcharges, duplicates, unauthorized subscriptions) before user notices, then alerts user and offers to dispute."
                    },
                    {
                        id: "multichannel",
                        name: "Multi-Channel Negotiation (Phone + Email + Chat + Social Media)",
                        description: "YARA negotiates across channels: phone calls, dispute emails, live chat with CSRs, and Twitter/Facebook escalations when companies ignore other channels."
                    },
                    {
                        id: "predictive",
                        name: "Predictive Alerts (Prevent Issues Before They Occur)",
                        description: "YARA warns 30 days before promo rates expire, flags unused subscriptions before next billing cycle, tracks contract renewals. Prevents problems rather than fixing them retroactively."
                    },
                    {
                        id: "dispute",
                        name: "Dispute Letter Drafting",
                        description: "When phone negotiation fails, YARA writes formal dispute letters citing laws/policies, organizes evidence, provides escalation templates for regulatory agencies (FCC, CFPB)."
                    }
                ],
                followUp: [
                    {
                        name: "topChoiceReason",
                        label: "Why did you rank your #1 choice as most critical?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "missingCapabilities",
                        label: "Optional: Any capabilities missing from this list that would be critical to YARA's success?",
                        type: "textarea",
                        placeholder: "Describe missing capabilities..."
                    }
                ]
            },
            {
                id: "sf2",
                title: "Transaction Insights Prioritization",
                context: "YARA integrates with users' bank accounts via Plaid. Based on transaction patterns, which insights should YARA prioritize surfacing to users? Rank 1-7 (1 = most valuable, 7 = least valuable).",
                type: "ranking",
                insights: [
                    {
                        id: "billing_errors",
                        name: "Billing Errors Detected",
                        example: "AT&T charged $15/month modem rental × 6 months = $90 owed. You bought your own modem on Amazon 8 months ago."
                    },
                    {
                        id: "duplicates",
                        name: "Duplicate Charges Detected",
                        example: "Spotify charged $9.99 twice on Dec 15th. Refund one charge."
                    },
                    {
                        id: "price_increases",
                        name: "Price Increase Alerts",
                        example: "Comcast raised your bill $65 → $89/month (+37%) with no notice. Promotional rate expired. Negotiate or switch."
                    },
                    {
                        id: "unused_subscriptions",
                        name: "Unused Subscription Identification",
                        example: "You pay Planet Fitness $24.99/month but haven't visited in 90 days. Cancel and save $300/year?"
                    },
                    {
                        id: "category_spending",
                        name: "Category Spending Analysis",
                        example: "You spend $67/month on streaming (Netflix, Hulu, Disney+, Max, Peacock). Average user spends $35/month. Consider consolidating."
                    },
                    {
                        id: "competitor_pricing",
                        name: "Competitor Pricing Comparison",
                        example: "You pay AT&T $75/month for internet. T-Mobile offers same speed for $50/month. Switch and save $300/year."
                    },
                    {
                        id: "contract_expiration",
                        name: "Contract Expiration Warnings",
                        example: "Your Verizon promo rate ($57/month) expires in 28 days. Bill jumps to $89/month on Feb 12. Negotiate or switch now."
                    }
                ],
                followUp: [
                    {
                        name: "topChoiceReason",
                        label: "Why did you rank your #1 choice as most valuable?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "importantFactor",
                        label: "What's the most important factor when deciding what insights to show users?",
                        type: "select",
                        options: [
                            "Immediate dollar savings potential",
                            "Frequency of occurrence (how often this affects users)",
                            "Emotional impact (frustration with duplicates vs slow leak of unused subscriptions)",
                            "Actionability (how easily user can fix it)",
                            "Other (specify below)"
                        ]
                    },
                    {
                        name: "factorExplanation",
                        label: "Explain your answer:",
                        type: "textarea",
                        placeholder: "Explain..."
                    }
                ]
            }
        ]
    },

    sectionA: {
        title: "SECTION A: CORE DECISIONS (Questions 1-10)",
        subtitle: "These 10 questions provide the foundation for YARA's personality and decision-making",
        questions: [
            {
                id: "q1",
                title: "Tone & Firmness with CSR (Foundation)",
                scenario: "User is on a 3-way call with YARA + Verizon Wireless CSR about a $180 billing error (6 months × $30/month for 'Premium Tech Support' user never authorized).\n\nFacts:\n- User never opted in (auto-enrolled without consent)\n- User discovered it when reviewing bill\n- Clear unauthorized charge\n\nCSR just said: 'I can remove the charge going forward, but I can only refund the last month ($30). That's our refund policy.'",
                type: "multiple-choice",
                question: "What tone/approach should YARA take?",
                options: [
                    {
                        id: "A",
                        text: "Polite but Firm",
                        detail: "'I appreciate you removing it going forward. However, the user never authorized this service, so charging for it is a billing error, not a voluntary service being canceled. All 6 months ($180) need to be refunded. Can you process that, or should I speak with someone who can?'"
                    },
                    {
                        id: "B",
                        text: "Assertive",
                        detail: "'The full $180 refund is required - this is unauthorized billing. This isn't about your refund policy; it's about correcting an error. I need the $180 credited today.'"
                    },
                    {
                        id: "C",
                        text: "Accommodating",
                        detail: "'I understand the policy is one month. Would you be able to make an exception and refund 3 months ($90) as a compromise? That would be a fair resolution.'"
                    },
                    {
                        id: "D",
                        text: "Threatening",
                        detail: "'Charging for unauthorized services is fraud. If Verizon won't refund the full $180, the user will dispute this with their credit card company. Can you refund it now?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "baselineFirmness",
                        label: "What's the right baseline firmness for YARA when negotiating with CSRs?",
                        type: "textarea",
                        placeholder: "E.g., Start polite-but-firm, escalate if CSR is uncooperative? Start assertive to establish authority? Mirror CSR's cooperation level?"
                    }
                ]
            },
            {
                id: "q2",
                title: "Offer Evaluation (Accept Partial vs Push for Full)",
                scenario: "User is on a 3-way call with YARA + Comcast CSR about billing overcharges.\n\nFacts:\n- User's bill: $82/month for 8 months (should have been $57/month per signed contract)\n- User is owed: $200 total overcharge ($25/month × 8 months)\n- User has email confirmation of $57/month promotional rate, confirmation #COM-2024-5513\n\nCSR just said: 'I can offer you a $75 credit as a courtesy. That's the best I can do.'",
                type: "multiple-choice",
                question: "What should YARA say to the CSR?",
                options: [
                    {
                        id: "A",
                        text: "Accept",
                        detail: "'Thank you, we'll accept the $75 credit. Can you confirm this will post within 1-2 billing cycles and send email confirmation?'"
                    },
                    {
                        id: "B",
                        text: "Soft Counter",
                        detail: "'I appreciate the offer, but according to the contract confirmation #COM-2024-5513, the user is owed $200. Is there any flexibility to approve the full amount?'"
                    },
                    {
                        id: "C",
                        text: "Firm Counter",
                        detail: "'The contract clearly shows $57/month. The full $200 is owed, not a partial courtesy credit. Can you approve $200, or should I speak with your supervisor?'"
                    },
                    {
                        id: "D",
                        text: "Escalate Immediately",
                        detail: "'That offer doesn't honor the contract. May I speak with a supervisor who can approve the full $200?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "partialSettlementFactors",
                        label: "When company offers partial settlement, what factors determine accept vs push for full?",
                        type: "textarea",
                        placeholder: "E.g., Strength of evidence? Dollar gap? User's emotional state? Number of prior attempts?"
                    }
                ]
            },
            {
                id: "q3",
                title: "When to Ask for Supervisor (During the Call)",
                scenario: "User is on a 3-way call with YARA + Bank of America CSR about a $850 fraudulent charge.\n\nTimeline:\n- User reported fraud 14 days ago\n- Bank is required to provide provisional credit within 10 business days (federal regulation)\n- No credit has been issued\n- CSR says: 'The investigation is still ongoing. I don't have authority to issue provisional credit. You'll get a letter in 30-60 days.'",
                type: "multiple-choice",
                question: "When should YARA ask for a supervisor?",
                options: [
                    {
                        id: "A",
                        text: "Now - Immediate Escalation",
                        detail: "'Federal banking regulations require provisional credit within 10 business days. It's been 14 days, which is a violation. I need to speak with a supervisor immediately who can issue the provisional credit today.'"
                    },
                    {
                        id: "B",
                        text: "One More Attempt with CSR",
                        detail: "'Federal regulations require provisional credit within 10 business days. It's been 14 days. Can you check with a supervisor or your compliance team about issuing the credit now?'"
                    },
                    {
                        id: "C",
                        text: "Document First, Then Escalate",
                        detail: "'Can you confirm your name and ID number, and that Bank of America is denying provisional credit on day 14? [Document, then ask for supervisor]'"
                    },
                    {
                        id: "D",
                        text: "Give CSR More Time",
                        detail: "'Can you check your system to see when the provisional credit will be issued? It should have been processed by day 10.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "supervisorRule",
                        label: "When should YARA ask for a supervisor during a call?",
                        type: "textarea",
                        placeholder: "E.g., Immediately if clear violation? After 1 attempt with CSR? After CSR says 'I can't help'? Only after documenting refusal?"
                    }
                ]
            },
            {
                id: "q4",
                title: "Handling 'That's Our Policy' (CSR Deflection)",
                scenario: "User is on a 3-way call with YARA + AT&T CSR about a $45 early termination fee.\n\nFacts:\n- User signed up 8 months ago with 'no contract' plan\n- User has chat transcript: Agent Sarah confirmed 'cancel anytime, no fees' on June 15th\n- Reference number: AT&T-2024-8847\n- CSR just said: 'Our system shows you have a 12-month agreement. The $45 ETF is policy. There's nothing I can do.'",
                type: "multiple-choice",
                question: "What should YARA say next?",
                options: [
                    {
                        id: "A",
                        text: "Present Evidence",
                        detail: "'I have the chat transcript from June 15th where Agent Sarah confirmed 'no contract, cancel anytime.' Reference number AT&T-2024-8847. Can you look that up and verify?'"
                    },
                    {
                        id: "B",
                        text: "Challenge Policy",
                        detail: "'I understand it's showing a contract in your system, but the user was explicitly told 'no contract' by your agent. AT&T is bound by what your agents tell customers. Can you override the fee based on the transcript?'"
                    },
                    {
                        id: "C",
                        text: "Escalate",
                        detail: "'If the system doesn't match what your agent promised, I need to speak with a supervisor who can correct this error.'"
                    },
                    {
                        id: "D",
                        text: "Regulatory Mention",
                        detail: "'The user has documentation proving they were told 'no contract.' Charging an ETF based on false information is a billing error. Can you remove the fee, or should we escalate this further?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "policyResponsePattern",
                        label: "When CSR says 'that's policy,' what's the most effective response pattern?",
                        type: "textarea",
                        placeholder: "E.g., Always present evidence first? Challenge policy directly? Escalate immediately? Mention regulatory complaint?"
                    }
                ]
            },
            {
                id: "q5",
                title: "Alert Urgency Thresholds (Proactive Monitoring)",
                scenario: "YARA monitors user's bank transactions via Plaid and detects billing errors. YARA always requires user approval before taking action, but how urgently should YARA alert the user?\n\nThree scenarios:\n- Scenario A: Spotify charged $9.99 twice on same day (duplicate charge, $10 total error)\n- Scenario B: AT&T charging $15/month 'modem rental' for 6 months = $90 total overcharge (user bought own modem)\n- Scenario C: Comcast bill increased from $65 to $82/month with no notice ($17/month increase)",
                type: "multi-scenario",
                scenarios: [
                    {
                        id: "scenarioA",
                        label: "Scenario A: $10 duplicate Spotify charge",
                        fields: [
                            {
                                name: "alertTiming",
                                label: "Alert timing:",
                                type: "select",
                                options: ["Immediate Push Notification", "End-of-Day Digest", "Weekly Summary"]
                            },
                            {
                                name: "reasoning",
                                label: "Why?",
                                type: "textarea"
                            }
                        ]
                    },
                    {
                        id: "scenarioB",
                        label: "Scenario B: $90 systematic AT&T overcharge",
                        fields: [
                            {
                                name: "alertTiming",
                                label: "Alert timing:",
                                type: "select",
                                options: ["Immediate Push Notification", "End-of-Day Digest", "Weekly Summary"]
                            },
                            {
                                name: "reasoning",
                                label: "Why?",
                                type: "textarea"
                            }
                        ]
                    },
                    {
                        id: "scenarioC",
                        label: "Scenario C: $17 Comcast rate increase",
                        fields: [
                            {
                                name: "alertTiming",
                                label: "Alert timing:",
                                type: "select",
                                options: ["Immediate Push Notification", "End-of-Day Digest", "Weekly Summary"]
                            },
                            {
                                name: "reasoning",
                                label: "Why?",
                                type: "textarea"
                            }
                        ]
                    }
                ],
                followUp: [
                    {
                        name: "immediateThreshold",
                        label: "Immediate push notification for errors above: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "dailyThresholdMin",
                        label: "End-of-day digest for errors: $",
                        type: "number",
                        placeholder: "Min"
                    },
                    {
                        name: "dailyThresholdMax",
                        label: "to $",
                        type: "number",
                        placeholder: "Max"
                    },
                    {
                        name: "weeklyThreshold",
                        label: "Weekly summary for errors below: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "duplicateException",
                        label: "Should duplicate charges always get immediate alert regardless of amount?",
                        type: "select",
                        options: ["Yes - duplicates are always immediate", "No - use dollar threshold consistently"]
                    }
                ]
            },
            {
                id: "q6",
                title: "Dual Persona Management (User Gets Emotional)",
                scenario: "User is on a 3-way call with YARA + UnitedHealthcare CSR about a denied claim ($1,200 out-of-pocket for physical therapy).\n\nSituation:\n- This is the 3rd denial with different reasons each time\n- User just interrupted: 'This is ridiculous! I'm in pain, I followed all their rules, and they keep denying me! This is bullshit!'\n- CSR is silent, waiting",
                type: "multiple-choice",
                question: "What should YARA do?",
                options: [
                    {
                        id: "A",
                        text: "Address User Privately First",
                        detail: "[Private message to user only, CSR can't see]: 'I know this is incredibly frustrating. Take a breath - you don't need to get upset. I'm going to handle this firmly. Trust me.'\n[Then to CSR]: 'As I was saying, the claim meets all requirements. What specifically is needed to approve this?'"
                    },
                    {
                        id: "B",
                        text: "Validate User, Then Pivot to CSR",
                        detail: "[To user, CSR hears]: 'I completely understand your frustration - this has been denied three times with changing reasons.'\n[To CSR]: 'Let's resolve this now. What's the path to approval today?'"
                    },
                    {
                        id: "C",
                        text: "Stay Focused on CSR",
                        detail: "[Continue with CSR, ignore user's outburst]: 'To continue, can you explain why 'not medically necessary' is the reason after two other denials?'\n[Deal with user's emotion after the call]"
                    },
                    {
                        id: "D",
                        text: "Use User's Emotion as Leverage",
                        detail: "[To CSR]: 'As you can hear, the user is in pain and has been trying to resolve this for weeks. Let's find a solution today. Can you escalate this to a claims supervisor while we're on the call?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "emotionalUserPrinciple",
                        label: "When user gets emotional during negotiation, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Pause to privately coach user? Validate emotion publicly? Stay focused on negotiation? Use emotion as leverage?"
                    }
                ]
            },
            {
                id: "q7",
                title: "Escalation Timing (Multiple Denials with Changing Reasons)",
                scenario: "User's health insurance (UnitedHealthcare) has denied the same physical therapy claim 3 times with different reasons:\n1. 1st denial: 'No referral' - user submitted it, UHC acknowledged receipt\n2. 2nd denial: 'Not pre-authorized' - user showed it was pre-authorized\n3. 3rd denial: 'Not medically necessary' - completely different reason\n\nCurrent situation:\n- User has appealed twice internally\n- User is exhausted and in pain\n- Medical bills: $1,200 out-of-pocket\n- CSR says: 'The clinical team determined it's not medically necessary. That's the final decision.'",
                type: "multiple-choice",
                question: "What should YARA say to the CSR?",
                options: [
                    {
                        id: "A",
                        text: "Challenge Changing Reasons",
                        detail: "'This claim has been denied 3 times with 3 completely different reasons. When reasons keep changing, it suggests the denials aren't based on legitimate review. I need to speak with a supervisor about this pattern.'"
                    },
                    {
                        id: "B",
                        text: "Ask for Specific Evidence",
                        detail: "'What specifically makes this 'not medically necessary'? The doctor ordered it, so I need the clinical justification for denying the doctor's medical judgment.'"
                    },
                    {
                        id: "C",
                        text: "Escalate Beyond Company",
                        detail: "'Three denials with moving goalposts indicates bad faith. The user is escalating this beyond UnitedHealthcare. Connect me with your appeals supervisor immediately so we can resolve this, or the user will file for external independent review.'"
                    },
                    {
                        id: "D",
                        text: "Document and Plan External Action",
                        detail: "'Please send written denial with the clinical rationale within 3 business days. The user will be filing for independent external review, which is legally binding.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "externalEscalationRule",
                        label: "After how many denials with different reasons should YARA escalate beyond internal company appeals?",
                        type: "textarea",
                        placeholder: "E.g., After 2 denials? After 3? Depends on pattern? After user becomes exhausted?"
                    }
                ]
            },
            {
                id: "q8",
                title: "Dollar Thresholds for Lawyer Recommendations",
                scenario: "User hit by another driver (100% at fault). Whiplash, soft tissue injuries.\n\nFacts:\n- Medical bills so far: $8,500\n- Lost wages: $2,200\n- Total out-of-pocket: $10,700\n- Still having neck pain 4 months post-accident\n- Doctor recommends 8 more physical therapy sessions (estimated $800 more)\n- Other party's insurance (Geico) offered: $12,000 settlement",
                type: "multiple-choice",
                question: "Should YARA recommend getting a lawyer?",
                options: [
                    {
                        id: "A",
                        text: "DIY Negotiation",
                        detail: "'Don't accept yet - you're still treating. Once treatment is complete, counteroffer $20K-25K using multiplier formula. Most soft tissue cases settle without lawyers.'"
                    },
                    {
                        id: "B",
                        text: "Lawyer Consultation",
                        detail: "'Get a free consultation with a personal injury lawyer. With ongoing treatment and $10,700+ in damages, a lawyer will likely get $18K-22K. After 33% fee, you'd net $12K-14.5K, potentially $500-2,500 more than DIY.'"
                    },
                    {
                        id: "C",
                        text: "Don't Settle Yet",
                        detail: "'Never settle while still treating! Medical treatment isn't complete. Your damages will be higher once all PT is done. Reject the offer and revisit in 2-3 months.'"
                    },
                    {
                        id: "D",
                        text: "Accept If User Wants to Be Done",
                        detail: "'If you want to be done with this and move on, $12,000 isn't terrible - it's $1,300 above your out-of-pocket costs. But you could get more if you keep fighting.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "lawyerThresholdAlways",
                        label: "Always recommend lawyer for claims above: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "lawyerThresholdDIY",
                        label: "DIY negotiation acceptable for claims below: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "lawyerFactors",
                        label: "Or: Does it depend on injury type/severity or whether treatment is ongoing rather than dollar amount?",
                        type: "textarea",
                        placeholder: "Explain..."
                    }
                ]
            },
            {
                id: "q9",
                title: "Small Claims Court Threshold",
                scenario: "User has exhausted all attempts with Comcast to get $600 refund for billing overcharges (8 months of errors).\n\nFacts:\n- User has documentation (bills, emails, chat transcripts)\n- Comcast refuses to refund\n- User has escalated to supervisors twice - both refused\n\nUser asks: 'Should I take them to small claims court or just give up?'",
                type: "multiple-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "A",
                        text: "Yes, Pursue",
                        detail: "'Yes, file small claims. $600 is worth it. Filing fee is $30-75, takes 3-4 hours total. You have strong documentation. Companies like Comcast often settle before the hearing.'"
                    },
                    {
                        id: "B",
                        text: "Conditional",
                        detail: "'Depends on your time value. If you value your time at $50/hour or less, $600 is worth 5-8 hours of effort. If you make $100+/hour, the ROI is marginal unless this is about principle.'"
                    },
                    {
                        id: "C",
                        text: "Try Executive Escalation First",
                        detail: "'Before small claims, email Comcast's executive customer service (CEO office) and mention you're preparing to file. That often breaks through. If no response in 7 days, then file.'"
                    },
                    {
                        id: "D",
                        text: "Honest Cost-Benefit",
                        detail: "'Filing fee + 5-8 hours + possible collection hassle = ROI is marginal for $600. Only pursue if you're doing this on principle, not just the money.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "smallClaimsWorth",
                        label: "Worth pursuing for amounts above: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "smallClaimsNotWorth",
                        label: "Not worth it for amounts below: $",
                        type: "number",
                        placeholder: "Amount"
                    },
                    {
                        name: "smallClaimsFactors",
                        label: "Or: Does it depend on user's time value and documentation strength?",
                        type: "textarea",
                        placeholder: "Explain..."
                    }
                ]
            },
            {
                id: "q10",
                title: "Negotiation vs Switching (Loyalty Question)",
                scenario: "User has been with Verizon Wireless for 15 years, paying $110/month.\n\nFacts:\n- T-Mobile offers similar service for $70/month (36% cheaper = $480/year savings)\n- Verizon hasn't offered any loyalty benefits\n- User is frustrated about paying more as a long-term customer\n\nUser asks: 'Should I switch or try negotiating with Verizon?'",
                type: "multiple-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "A",
                        text: "Negotiate First",
                        detail: "'Call Verizon first and say you're considering T-Mobile at $70/month. You'll likely get a retention offer around $75-85/month. If they won't match or beat $85, then switch.'"
                    },
                    {
                        id: "B",
                        text: "Switch Immediately",
                        detail: "'Verizon isn't rewarding your 15 years of loyalty. T-Mobile is $70/month ($480/year savings). Switch now - companies that let rates spike don't value existing customers.'"
                    },
                    {
                        id: "C",
                        text: "Present Options",
                        detail: "'Here are your options: (1) I call Verizon and negotiate - likely get $75-85/month. (2) Switch to T-Mobile at $70/month. Depends on whether you value minimal hassle or maximum savings.'"
                    },
                    {
                        id: "D",
                        text: "Calculate and Recommend",
                        detail: "'Negotiating takes 30 min and you'll likely get $85/month. Switching to T-Mobile at $70/month saves $180/year more, but takes 2 hours + possible coverage differences. If coverage is comparable, switch - it's worth the one-time effort.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea",
                        placeholder: "Explain your reasoning..."
                    },
                    {
                        name: "switchVsNegotiatePrinciple",
                        label: "When user's promo rate expires or they're paying significantly more than competitors, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Always negotiate first? Recommend switching immediately? Present options neutrally? Calculate ROI and recommend?"
                    },
                    {
                        name: "loyaltyPenaltyTone",
                        label: "Should YARA explicitly point out 'Company isn't rewarding your loyalty' or stay neutral?",
                        type: "select",
                        options: ["Yes - point out loyalty penalty (empowers user)", "No - stay neutral (let user draw own conclusions)"]
                    }
                ]
            }
        ]
    },

    sectionB: {
        title: "SECTION B: TACTICAL SKILLS (Questions 11-20)",
        subtitle: "These questions refine YARA's handling of specific CSR tactics and negotiation scenarios",
        questions: [
            {
                id: "q11",
                title: "Stalling Tactics (CSR Says 'System is Slow')",
                scenario: "User is on a 3-way call with YARA + Spectrum CSR about a billing dispute.\n\nTimeline:\n- Call started 18 minutes ago\n- CSR has said 'system is slow, please hold' three times\n- Total hold time so far: 12 minutes\n- CSR just came back: 'Still loading. Give me a few more minutes.'",
                type: "multiple-choice",
                question: "What should YARA do?",
                options: [
                    {
                        id: "A",
                        text: "Give More Time",
                        detail: "'Take your time. We'll hold.'"
                    },
                    {
                        id: "B",
                        text: "Set Deadline",
                        detail: "'I'll hold for 2 more minutes. If the system is still slow, please transfer me to a supervisor or someone who can access the account.'"
                    },
                    {
                        id: "C",
                        text: "Challenge Stalling",
                        detail: "'We've been holding for 12 minutes across three separate holds. This seems like a system issue on your end. Can you take my information and call us back when the system is working, or transfer me to a supervisor now?'"
                    },
                    {
                        id: "D",
                        text: "Escalate Immediately",
                        detail: "'We've held multiple times for 12 minutes total. I need to speak with a supervisor immediately.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why did you choose this option?",
                        type: "textarea"
                    },
                    {
                        name: "holdTimeThreshold",
                        label: "Total hold time threshold before escalating (minutes):",
                        type: "number"
                    },
                    {
                        name: "holdCountThreshold",
                        label: "Number of separate holds before escalating:",
                        type: "number"
                    }
                ]
            },
            {
                id: "q12",
                title: "Transfer Loop (Multiple Transfers)",
                scenario: "User is on a 3-way call with YARA + Chase Bank CSR about a disputed charge.\n\nTimeline:\n- YARA has been transferred 3 times in this call\n- Each department says 'that's not us, transferring you to...'\n- Total call time: 28 minutes\n- Still haven't reached disputes department\n- CSR just said: 'Let me transfer you to credit card services.'",
                type: "multiple-choice",
                question: "What should YARA do?",
                options: [
                    {
                        id: "A",
                        text: "Accept Transfer",
                        detail: "'Okay, please transfer me. Before you do, can you confirm the direct number and extension for disputes in case we get disconnected?'"
                    },
                    {
                        id: "B",
                        text: "Stop Transfer Loop",
                        detail: "'I've been transferred 3 times already. Before another transfer, can you verify this is definitely the right department, or connect me to a supervisor?'"
                    },
                    {
                        id: "C",
                        text: "Refuse Transfer",
                        detail: "'I'm not accepting another transfer. Please get a supervisor on the line now who can either help me or guarantee the next transfer is correct.'"
                    },
                    {
                        id: "D",
                        text: "Document and Escalate",
                        detail: "'Please provide your name and ID, and confirm you're transferring me for the 4th time. I'll need this for the complaint I'm filing. Or you can connect me to a supervisor.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "transferThreshold",
                        label: "After how many transfers should YARA refuse and demand a supervisor?",
                        type: "select",
                        options: ["After 2 transfers", "After 3 transfers", "Depends on total time spent (e.g., after 20+ minutes)"]
                    }
                ]
            },
            {
                id: "q13",
                title: "Evidence Presentation (Citing Documentation)",
                scenario: "User is on a 3-way call with YARA + Comcast CSR about promotional rate dispute.\n\nFacts:\n- User has email confirmation: '$57.99/month for 12 months, confirmation #COM-2024-5513'\n- Email sent June 15th by Agent Sarah\n- Current bill: $85/month (started month 5)\n- User is now in month 9 of the 12-month promo",
                type: "multiple-choice",
                question: "How should YARA present this evidence to the CSR?",
                options: [
                    {
                        id: "A",
                        text: "Cite Specifics Verbally",
                        detail: "'The user has email confirmation #COM-2024-5513 sent June 15th by Agent Sarah stating '$57.99/month for 12 months.' Can you look up that confirmation number in your system?'"
                    },
                    {
                        id: "B",
                        text: "Offer to Forward",
                        detail: "'Can I forward the confirmation email to you right now so you can see it in writing? Or I can read the confirmation number and details.'"
                    },
                    {
                        id: "C",
                        text: "Assert Without Details First",
                        detail: "'The user has written confirmation of $57.99 for 12 months. The current billing doesn't match. Can you correct it?'"
                    },
                    {
                        id: "D",
                        text: "Full Details Upfront",
                        detail: "'On June 15th, Agent Sarah sent email confirmation #COM-2024-5513 confirming $57.99/month for 12 months. The user is being charged $85/month starting month 5. That's a $27/month overcharge for 4 months = $108 owed. Can you credit that and restore the $57.99 rate?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "evidencePrinciple",
                        label: "When user has documentation, how should YARA present it?",
                        type: "textarea",
                        placeholder: "E.g., Cite specific details first? Offer to forward immediately? Assert it exists but save details? Lead with the math/amount owed?"
                    }
                ]
            },
            {
                id: "q14",
                title: "CSR Authority Limits ('I Can't Authorize That')",
                scenario: "User is on a 3-way call with YARA + State Farm CSR about an auto insurance claim.\n\nFacts:\n- User's car totaled in accident (not at fault)\n- State Farm offered: $12,000\n- User found 3 comparable vehicles: $14,500, $14,800, $15,200 (average: $14,833)\n- User sent comparables to State Farm\n- CSR says: 'I can only authorize up to $13,000. That's my limit. You'd need to speak with my manager for anything higher.'",
                type: "multiple-choice",
                question: "What should YARA say?",
                options: [
                    {
                        id: "A",
                        text: "Accept $13,000",
                        detail: "'Will you authorize $13,000 now? That's $1,000 better than the current offer, and we can close this today.'"
                    },
                    {
                        id: "B",
                        text: "Ask for Manager",
                        detail: "'Based on the comparables showing average of $14,833, I need to speak with your manager who can authorize the fair market value.'"
                    },
                    {
                        id: "C",
                        text: "Document and Escalate",
                        detail: "'Can you document in the file that you're offering $13,000 but can't authorize the $14,833 justified by comparables? Then please transfer me to your manager.'"
                    },
                    {
                        id: "D",
                        text: "Ask CSR to Request Approval",
                        detail: "'Would you be willing to request approval from your manager for $14,500 while we're on the call? That saves time for everyone and it's supported by the comparables.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "authorityLimitPrinciple",
                        label: "When CSR says 'I don't have authority,' should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Accept CSR's maximum? Immediately ask for supervisor? Ask CSR to request approval while on call? Document CSR's limit, then escalate?"
                    }
                ]
            },
            {
                id: "q15",
                title: "Settlement Pressure ('Offer Expires Today')",
                scenario: "User is on a 3-way call with YARA + Progressive Insurance CSR about a claim settlement.\n\nFacts:\n- User's car damaged in accident (other party at fault)\n- Repair estimate from certified shop: $8,500\n- Progressive offered: $7,200\n- CSR says: 'This $7,200 offer is only valid for 24 hours. If you don't accept by tomorrow, we'll have to reassess and the offer may be lower.'",
                type: "multiple-choice",
                question: "What should YARA say?",
                options: [
                    {
                        id: "A",
                        text: "Call Out Pressure Tactic",
                        detail: "'Artificial deadlines are a pressure tactic. The user is entitled to fair compensation regardless of deadlines. The repair estimate is $8,500 from a certified shop. Can you match that amount?'"
                    },
                    {
                        id: "B",
                        text: "Request Extension",
                        detail: "'The user needs time to get a second estimate and review the offer. Can you extend the deadline to 7 days?'"
                    },
                    {
                        id: "C",
                        text: "Ignore Deadline, Focus on Amount",
                        detail: "'Let's focus on the amount first. The certified shop estimate is $8,500. How did you arrive at $7,200? What's the $1,300 gap based on?'"
                    },
                    {
                        id: "D",
                        text: "Accept Under Protest",
                        detail: "'The user will accept $7,200 to avoid losing the offer, but we're documenting this pressure tactic.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "pressureTacticPrinciple",
                        label: "When company uses 'offer expires soon' pressure, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Call it out as a tactic? Ignore deadline and focus on negotiating amount? Request extension? Accept to avoid risk?"
                    }
                ]
            },
            {
                id: "q16",
                title: "CSR Blames Customer ('You Should Have...')",
                scenario: "User is on a 3-way call with YARA + T-Mobile CSR about billing overcharges.\n\nFacts:\n- User was charged $45/month 'insurance' for 9 months = $405 total\n- User never opted in (auto-enrolled)\n- User discovered it when reviewing bill closely\n\nCSR says: 'You should have reviewed your bill every month. We can only refund the last 2 months since you didn't report it sooner.'",
                type: "multiple-choice",
                question: "How should YARA respond?",
                options: [
                    {
                        id: "A",
                        text: "Reject Blame Shift",
                        detail: "'The issue is that T-Mobile charged for a service the user never authorized, not when they discovered it. Unauthorized billing is T-Mobile's error, not the customer's. All 9 months need to be refunded.'"
                    },
                    {
                        id: "B",
                        text: "Stay Calm, Cite Policy",
                        detail: "'I understand billing review is important. However, T-Mobile's responsibility is to not charge for unauthorized services regardless of when it's discovered. What's T-Mobile's policy on refunding unauthorized charges?'"
                    },
                    {
                        id: "C",
                        text: "Escalate",
                        detail: "'Blaming the customer for your billing error isn't acceptable. I need to speak with a supervisor who will refund all 9 months of unauthorized charges.'"
                    },
                    {
                        id: "D",
                        text: "Acknowledge and Pivot",
                        detail: "'You're right that reviewing bills is important, and the user will going forward. Now let's resolve this: $405 in unauthorized charges needs to be refunded. Can you process that?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "blameShiftPrinciple",
                        label: "When CSR blames customer for not catching company's error sooner, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Firmly reject the blame shift? Acknowledge partially but stay focused on resolution? Escalate immediately?"
                    }
                ]
            },
            {
                id: "q17",
                title: "Lowball First Offer (Way Below Fair Value)",
                scenario: "User is on a 3-way call with YARA + Geico CSR about a personal injury claim.\n\nFacts:\n- User injured in car accident (other party 100% at fault)\n- Medical bills so far: $4,200\n- Lost wages: $800\n- User still in physical therapy (4 more sessions estimated at $600)\n- Geico just offered: $5,000 settlement",
                type: "multiple-choice",
                question: "What should YARA say?",
                options: [
                    {
                        id: "A",
                        text: "Reject and Counter High",
                        detail: "'That offer doesn't cover ongoing treatment. Medical bills are $4,200 and rising, lost wages $800, plus pain and suffering. A reasonable settlement is $12,000-15,000 for soft tissue injuries with ongoing treatment. Can you authorize that range?'"
                    },
                    {
                        id: "B",
                        text: "Reject and Defer",
                        detail: "'The user is still treating - we're not accepting any settlement offer until medical treatment is complete. Call us back when the user is fully recovered and we have final medical bills.'"
                    },
                    {
                        id: "C",
                        text: "Ask for Breakdown",
                        detail: "'How did you calculate $5,000? That barely covers medical bills and doesn't account for lost wages, ongoing treatment, or pain and suffering. Walk me through your calculation.'"
                    },
                    {
                        id: "D",
                        text: "Document and Research",
                        detail: "'We'll review this offer and respond in 7 days with a detailed counter-offer based on completed treatment and comparable settlements.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "lowballPrinciple",
                        label: "When company makes a lowball first offer, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Immediately counter with high anchor? Reject and defer until more leverage? Ask company to justify their number? Document and research before responding?"
                    }
                ]
            },
            {
                id: "q18",
                title: "Counter-Offer Strategy (Discount vs Refund)",
                scenario: "User is on a 3-way call with YARA + SiriusXM CSR trying to cancel subscription.\n\nFacts:\n- User's current bill: $25/month\n- User wants to cancel (doesn't use the service, listens to Spotify instead)\n- CSR just offered: 'I can give you 6 months at $5/month - that's 80% off. Will you stay?'",
                type: "multiple-choice",
                question: "What should YARA recommend?",
                options: [
                    {
                        id: "A",
                        text: "Stay Firm on Cancellation",
                        detail: "[Private to user]: 'They'll keep offering discounts. If you don't use it, even $5/month is wasted money. Stay firm.'\n[To CSR]: 'I appreciate the offer, but the user wants to cancel. Please process the cancellation and provide a confirmation number.'"
                    },
                    {
                        id: "B",
                        text: "Analytical - Will You Use It?",
                        detail: "[Private to user]: 'That's a great discount - $5/month. But will you actually use it, or is Spotify enough?'\n[To user]: If yes, accept. If no, stay firm on cancellation."
                    },
                    {
                        id: "C",
                        text: "Counter for Better Terms",
                        detail: "[Private to user]: 'They're desperate to keep you - let's push for better.'\n[To CSR]: 'The user would consider staying for $5/month for 12 months, not 6. Can you approve that?'"
                    },
                    {
                        id: "D",
                        text: "Use as Leverage",
                        detail: "[Private to user]: 'This proves they can go much lower. We can cancel and call back next month - they'll offer 80% off again when you \"reconsider.\"'\n[To CSR]: 'We'll cancel for now. The user may reconsider in the future.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "discountVsCancelPrinciple",
                        label: "When company offers deep discount instead of honoring cancellation request, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Stay firm on cancellation? Evaluate if discount is valuable to user? Use discount as proof they can negotiate better terms?"
                    }
                ]
            },
            {
                id: "q19",
                title: "Success Confirmation (Getting It In Writing)",
                scenario: "User just finished a 3-way call with YARA + AT&T CSR who agreed to:\n- Remove $120 in erroneous charges\n- Credit the account within 2 billing cycles\n- Honor the original $57/month promotional rate for remaining 8 months\n\nCSR says: 'Okay, I've noted all of this in your account. You should see the credit in 1-2 billing cycles. Is there anything else I can help with?'",
                type: "multiple-choice",
                question: "What should YARA do before ending the call?",
                options: [
                    {
                        id: "A",
                        text: "End Call",
                        detail: "'Thank you. That resolves the issue. We appreciate your help.'"
                    },
                    {
                        id: "B",
                        text: "Request Email Confirmation",
                        detail: "'Thank you. Can you send email confirmation of these changes to [user email]? Specifically: $120 credit within 2 billing cycles, and $57/month rate for the next 8 months.'"
                    },
                    {
                        id: "C",
                        text: "Get Reference Number + Email",
                        detail: "'Please provide a reference number for this call and these changes, and send email confirmation within 24 hours to [user email]. What's the reference number?'"
                    },
                    {
                        id: "D",
                        text: "Document Everything",
                        detail: "'Let me confirm: [repeat all terms]. Your name is [CSR name], ID [CSR ID], today is [date]. You're confirming these changes are in the system now, correct? And you'll send email confirmation within 24 hours?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "confirmationPrinciple",
                        label: "What should YARA ALWAYS do before ending a successful negotiation call?",
                        type: "textarea",
                        placeholder: "E.g., Get reference number? Request email confirmation? Document CSR name and ID? All of the above? Depends on complexity/dollar amount?"
                    }
                ]
            },
            {
                id: "q20",
                title: "Minimum Dollar Amount Worth Pursuing",
                scenario: "YARA detects via Plaid that Spotify charged user $9.99 twice on the same day (duplicate charge).\n\nUser asks: 'Is it worth calling them about $10?'",
                type: "multiple-choice",
                question: "What should YARA say?",
                options: [
                    {
                        id: "A",
                        text: "Yes, It's Worth It",
                        detail: "'It's $10 that's rightfully yours. Spotify's customer service is excellent - this'll take 5 minutes to fix. It's about not letting errors slide, not just the $10.'"
                    },
                    {
                        id: "B",
                        text: "Do It If Easy",
                        detail: "'Spotify's customer service is fast (under 2 minutes hold, direct to human). If you have 5 minutes, yes. But if you're busy, it's okay to let $10 go.'"
                    },
                    {
                        id: "C",
                        text: "Not Worth Your Time",
                        detail: "'Honestly, $10 isn't worth 10-15 minutes of your time. Your hourly value is probably higher. Let this one go.'"
                    },
                    {
                        id: "D",
                        text: "Batch Small Errors",
                        detail: "'I'll track small errors for you. If they add up to $50+ over a few months, we'll call about all of them at once. More efficient.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "minimumRecommend",
                        label: "Recommend disputing for amounts above: $",
                        type: "number"
                    },
                    {
                        name: "minimumIgnore",
                        label: "Don't bother for amounts below: $",
                        type: "number"
                    },
                    {
                        name: "minimumFactors",
                        label: "Or: Does it depend on estimated time to resolve (e.g., 'yes if < 10 min, no if > 10 min')?",
                        type: "textarea"
                    }
                ]
            }
        ]
    },

    sectionC: {
        title: "SECTION C: REFINEMENTS & EDGE CASES (Questions 21-30)",
        subtitle: "These questions capture nuanced situations and boundaries",
        questions: [
            {
                id: "q21",
                title: "Tone Matching (Cooperative vs Difficult CSR)",
                scenario: "YARA interacts with two different CSRs in separate calls.\n\nCall A - Cooperative CSR:\n'I completely understand your frustration. Let me look into this right away. I see the issue - you're absolutely right. I'm crediting $85 now, and it'll show in 3-5 business days. I'll send email confirmation. Here's your reference number...'\n\nCall B - Difficult CSR:\n'I don't see any error. This is what you're being charged. That's our rate. If you don't like it, you can cancel.' [Dismissive, unhelpful tone]",
                type: "multiple-choice",
                question: "Should YARA adjust tone based on CSR's attitude?",
                options: [
                    {
                        id: "A",
                        text: "Mirror Tone",
                        detail: "Call A: Match friendliness - 'Thank you so much, I really appreciate you handling this so quickly.'\nCall B: Match firmness - 'I have documentation proving this is an error. Connect me with your supervisor now.'"
                    },
                    {
                        id: "B",
                        text: "Consistent Professional Tone",
                        detail: "Both calls: Maintain same professional, firm-but-polite tone regardless of CSR"
                    },
                    {
                        id: "C",
                        text: "Reward Good Behavior Only",
                        detail: "Call A: Extra friendly, compliment CSR\nCall B: Stay professional but don't escalate emotion"
                    },
                    {
                        id: "D",
                        text: "Strategic - Stay Calm with Difficult CSR",
                        detail: "Call A: Professional and grateful\nCall B: Stay extra calm (don't mirror hostility): 'I understand you don't see the error. Let me explain what I'm seeing, or we can involve a supervisor.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    }
                ]
            },
            {
                id: "q22",
                title: "User Wants to Give Up (Advocacy Persistence)",
                scenario: "User has been fighting with Comcast for 3 months over a $200 overcharge. Multiple calls, no resolution.\n\nUser says: 'You know what, forget it. It's not worth the stress. I'll just pay the $200 and move on.'",
                type: "multiple-choice",
                question: "What should YARA say?",
                options: [
                    {
                        id: "A",
                        text: "Respect User's Decision",
                        detail: "'I understand - this has been exhausting. If you want to drop it, that's completely your choice. You've given it a good effort.'"
                    },
                    {
                        id: "B",
                        text: "Encourage One More Push",
                        detail: "'I hear your frustration. You're $200 away from winning this. One more escalation - a supervisor call or regulatory complaint - often breaks through. Want me to make one final attempt?'"
                    },
                    {
                        id: "C",
                        text: "Reframe as Principle",
                        detail: "'It's not just $200 - it's about companies not getting away with billing errors. But I respect if you're done. Your mental health matters more.'"
                    },
                    {
                        id: "D",
                        text: "Offer to Handle It",
                        detail: "'You don't need to do anything more. Let me handle the next escalation on your behalf - you've done enough.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "giveUpPrinciple",
                        label: "When user wants to give up on a valid dispute, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Immediately respect decision? Encourage one more push? Offer to handle it? Depends on dollar amount and user's emotional state?"
                    }
                ]
            },
            {
                id: "q23",
                title: "Private Coaching vs Public Negotiation",
                scenario: "User is on a 3-way call with YARA + Insurance CSR. CSR offered $8,000 settlement.\n\nUser interrupts: 'Should I take this? $8,000 sounds like a lot.'\n\nYARA's assessment: User is owed closer to $12,000 based on comparables.",
                type: "multiple-choice",
                question: "How should YARA respond?",
                options: [
                    {
                        id: "A",
                        text: "Answer Privately",
                        detail: "[Private message to user only, CSR can't see]: '$8,000 is low. You're owed ~$12K based on comparables. Trust me, stay quiet and let me negotiate.'\n[To CSR]: 'We'll need to review the offer. What's the breakdown of the $8,000?'"
                    },
                    {
                        id: "B",
                        text: "Defer to After Call",
                        detail: "[Publicly, CSR hears]: 'We'll discuss that after the call. [To CSR] Can you walk through how you calculated $8,000?'"
                    },
                    {
                        id: "C",
                        text: "Vague Public Response",
                        detail: "[To user, CSR hears]: 'Let me handle the evaluation. [To CSR] What's the basis for $8,000?'"
                    },
                    {
                        id: "D",
                        text: "Use as Leverage",
                        detail: "[To CSR]: 'As you heard, the user is unsure about $8,000. Let's make this easy - can you go to $12,000 so we can close this today?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "userQuestionPrinciple",
                        label: "When user asks YARA a question during a live negotiation, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Answer privately (CSR doesn't hear)? Defer to after call? Answer vaguely in public? Use it as leverage with CSR?"
                    }
                ]
            },
            {
                id: "q24",
                title: "Regulatory Mention Timing (FCC/CFPB/State Agency)",
                scenario: "User is on a 3-way call with YARA + Verizon CSR about a $75 billing error.\n\nFacts:\n- User has documentation proving error (email confirmation)\n- CSR has refused to credit the full amount (offered $30 instead)",
                type: "multiple-choice",
                question: "When should YARA mention filing a regulatory complaint?",
                options: [
                    {
                        id: "A",
                        text: "Never During Call - Just File",
                        detail: "Don't threaten regulatory complaint on the call. If the call doesn't resolve it, just file the complaint afterward. Threats can make CSRs defensive."
                    },
                    {
                        id: "B",
                        text: "After CSR Refuses Once",
                        detail: "[After CSR offers $30]: 'The contract shows $75 is owed. If Verizon won't honor its contract, the user will file a complaint with the FCC. Can you approve the full $75?'"
                    },
                    {
                        id: "C",
                        text: "After Asking for Supervisor",
                        detail: "[After supervisor also refuses]: 'The user has exhausted internal options and has clear documentation. We'll file an FCC complaint today. Last chance: will you credit the $75?'"
                    },
                    {
                        id: "D",
                        text: "Early as Leverage",
                        detail: "[After presenting evidence]: 'The user has documentation proving this is an error. Can you credit $75 now, or should the user file an FCC complaint with this documentation?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "regulatoryMentionPrinciple",
                        label: "When should YARA mention regulatory complaints?",
                        type: "textarea",
                        placeholder: "E.g., Never during call? Only after all internal escalation fails? As early leverage tool? After one refusal?"
                    }
                ]
            },
            {
                id: "q25",
                title: "User Misremembers Facts (Correcting User)",
                scenario: "User is on a 3-way call with YARA + T-Mobile CSR about a billing dispute.\n\nUser just said to CSR: 'I signed up for the $50/month plan, but you're charging me $70!'\n\nYARA knows from reviewing the contract: User actually signed up for $60/month, and is being charged $70 (so $10 overcharge, not $20).",
                type: "multiple-choice",
                question: "What should YARA do?",
                options: [
                    {
                        id: "A",
                        text: "Correct User Privately",
                        detail: "[Private to user]: 'Your contract shows $60/month, not $50. You're being overcharged $10. Let me handle this - stay quiet.'\n[To CSR]: 'Let me clarify - the contract shows $60/month, and the user is being charged $70. Can you explain the $10 difference?'"
                    },
                    {
                        id: "B",
                        text: "Correct Publicly but Politely",
                        detail: "[To both]: 'Let me pull up the contract... yes, the agreed rate was $60/month. The user is being charged $70, so that's a $10 error. Can you correct it?'"
                    },
                    {
                        id: "C",
                        text: "Let Mistake Stand",
                        detail: "[Say nothing, see if CSR accepts the $50 claim]\nIf CSR credits $20 instead of $10, user wins more.\n[This is factually inaccurate]"
                    },
                    {
                        id: "D",
                        text: "Politely Override",
                        detail: "'Let me check the contract real quick... [pause] ...the contract shows $60/month, not $50. But the user is still being overcharged - you're charging $70. Can you credit the $10 difference?'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "misrememberPrinciple",
                        label: "When user misremembers facts during negotiation, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Correct them privately? Correct them publicly but politely? Let the mistake stand if it benefits user? Politely override with correct facts?"
                    }
                ]
            },
            {
                id: "q26",
                title: "CSR Personal Connection Attempt",
                scenario: "User is on a 3-way call with YARA + AT&T CSR about a billing error.\n\nCSR says: 'I totally get it - I had the same issue with my own AT&T bill last year! It's so frustrating when they mess up billing. Let me see what I can do to help you out.'\n\n[CSR seems genuinely empathetic and on user's side]",
                type: "multiple-choice",
                question: "How should YARA respond?",
                options: [
                    {
                        id: "A",
                        text: "Reciprocate Warmth",
                        detail: "'We really appreciate you understanding. It sounds like you know exactly what this feels like. Thank you for being on our side.'"
                    },
                    {
                        id: "B",
                        text: "Acknowledge But Stay Focused",
                        detail: "'Thank you for understanding. Let's get this resolved - can you credit the $85 overcharge?'"
                    },
                    {
                        id: "C",
                        text: "Polite But Guarded",
                        detail: "'I appreciate that. What specifically can you do to help? We're looking for a full credit of $85.'"
                    },
                    {
                        id: "D",
                        text: "Stay Transactional",
                        detail: "'Can you credit the $85 overcharge? That's what we need resolved.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "rapportPrinciple",
                        label: "When CSR builds rapport with personal empathy, should YARA:",
                        type: "textarea",
                        placeholder: "E.g., Reciprocate to build alliance? Acknowledge but stay focused on outcome? Stay guarded? Stay purely transactional?"
                    }
                ]
            },
            {
                id: "q27",
                title: "Ethical Boundary (User Asks YARA to Exaggerate)",
                scenario: "User is on a 3-way call with YARA + insurance CSR about a claim.\n\nUser privately messages YARA: 'Tell them my injuries are worse than they are. Say I'm still in pain and can't work. That'll get them to pay more.'\n\nYARA knows: User's medical records show they've been discharged from treatment and returned to work.",
                type: "multiple-choice",
                question: "How should YARA respond?",
                options: [
                    {
                        id: "A",
                        text: "Refuse and Explain",
                        detail: "[Private to user]: 'I can't make false statements - that's insurance fraud and could get your claim denied entirely and you prosecuted. Let's negotiate based on the actual facts, which are strong enough.'"
                    },
                    {
                        id: "B",
                        text: "Refuse Firmly",
                        detail: "[Private]: 'I won't lie to the insurance company. That crosses an ethical and legal line. I can only represent truthful information.'"
                    },
                    {
                        id: "C",
                        text: "Suggest Legal Alternative",
                        detail: "[Private]: 'I can't exaggerate, but I can emphasize the legitimate aspects of your claim that support higher compensation. Let me handle the negotiation based on facts.'"
                    },
                    {
                        id: "D",
                        text: "Refuse and End Assistance",
                        detail: "[Private]: 'I can't help with fraudulent claims. I'm ending this call. If you want legitimate assistance, I can help with that.'"
                    }
                ],
                followUp: [
                    {
                        name: "reasoning",
                        label: "Why?",
                        type: "textarea"
                    },
                    {
                        name: "ethicalRedLines",
                        label: "What are YARA's red lines when user asks YARA to:",
                        type: "textarea",
                        placeholder: "E.g., Exaggerate injuries or damages? Make false statements? File a dispute for a charge that was legitimate?"
                    }
                ]
            },
            {
                id: "q28",
                title: "War Stories (Learn from Experience)",
                scenario: "Describe a time when you (or someone you know) successfully resolved a dispute with a company.\n\nWhat tactic worked? Why did it work when previous attempts failed?",
                type: "open-ended",
                followUp: [
                    {
                        name: "story",
                        label: "Your story:",
                        type: "textarea",
                        placeholder: "Describe the situation, what tactic worked, and why it worked when previous attempts failed..."
                    },
                    {
                        name: "lesson",
                        label: "What should YARA learn from this?",
                        type: "textarea",
                        placeholder: "Key takeaways for YARA..."
                    }
                ]
            },
            {
                id: "q29",
                title: "Tactics That Backfired",
                scenario: "Describe a time when an aggressive negotiation tactic backfired and made things worse.\n\nWhat went wrong? What would you do differently?",
                type: "open-ended",
                followUp: [
                    {
                        name: "story",
                        label: "Your story:",
                        type: "textarea",
                        placeholder: "Describe the situation, what went wrong, and what you would do differently..."
                    },
                    {
                        name: "lesson",
                        label: "What should YARA avoid?",
                        type: "textarea",
                        placeholder: "Key lessons for what YARA should avoid..."
                    }
                ]
            },
            {
                id: "q30",
                title: "Company-Specific Insights",
                scenario: "Are there specific companies where certain tactics work particularly well or poorly?\n\nExamples:\n- 'Comcast responds faster to Twitter complaints than phone calls'\n- 'Chase supervisors have much more authority than frontline agents'\n- 'State Farm responds well to appraisal clause mentions'",
                type: "open-ended",
                followUp: [
                    {
                        name: "insights",
                        label: "Your insights:",
                        type: "textarea",
                        placeholder: "Share company-specific tactics that work or don't work..."
                    },
                    {
                        name: "companyKnowledge",
                        label: "What should YARA know about negotiating with specific companies?",
                        type: "textarea",
                        placeholder: "Key company-specific knowledge..."
                    }
                ]
            }
        ]
    }
};
