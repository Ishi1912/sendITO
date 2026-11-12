
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

async function generateWithGroq(prompt) {
    if (!GROQ_API_KEY) {
        throw new Error("GROQ_API_KEY is missing from the backend environment.");
    }

    const response = await fetch(GROQ_API_URL, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${GROQ_API_KEY}`,
        },
        body: JSON.stringify({
            model: GROQ_MODEL,
            messages: [
                {
                    role: "system",
                    content: "You are a helpful AI assistant. Follow the user's instructions carefully and return valid JSON whenever requested."
                },
                {
                    role: "user",
                    content: prompt
                }
            ],
            temperature: 0.7,
            max_completion_tokens: 2048,
            response_format: {
                type: "json_object"
            }
        })
    });

    const result = await response.json();

    if (!response.ok) {
        console.error("Groq API error:", result);
        throw new Error(
            result.error?.message || `Groq API request failed (${response.status}).`
        );
    }

    const generatedText = result.choices?.[0]?.message?.content;

    if (!generatedText) {
        throw new Error("Groq returned an empty response.");
    }

    return generatedText;
}

function parseAIJson(text) {
    const cleaned = text
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();

    try {
        return JSON.parse(cleaned);
    } catch {
        throw new Error("AI returned an invalid JSON response. Please try again.");
    }
}

// Generate marketing email
async function generateEmail(prompt) {
    const fullPrompt = `
Generate a professional marketing email based on the user's request.

Requirements:
- Create an attractive subject line.
- Use the requested tone and audience.
- Keep the email concise, around 150-200 words.
- Include a suitable greeting.
- Include a clear call-to-action.
- Do not use placeholders like [Your Name] or [Company Name].
- Do not invent factual offers, prices or guarantees.

Return ONLY valid JSON in this format:

{
    "subject": "Email subject",
    "content": "Complete email content"
}

User Request:
${prompt}
`;

    const response = await generateWithGroq(fullPrompt);
    const email = parseAIJson(response);

    if (
        typeof email.subject !== "string" ||
        typeof email.content !== "string" ||
        !email.subject.trim() ||
        !email.content.trim()
    ) {
        throw new Error("AI did not return a valid email subject and content.");
    }

    return {
        subject: email.subject.trim(),
        content: email.content.trim()
    };
}

// AI-based spam-risk analysis
async function analyzeSpamRiskWithAI(subject, content) {
    const prompt = `
You are an email content risk analysis assistant.

Analyze the following email for spam-like characteristics.

Subject:
${subject}

Content:
${content}

Evaluate:
1. Aggressive or manipulative language.
2. Misleading or unrealistic claims.
3. Excessive promotional tone.
4. Suspicious context.
5. Artificial urgency.
6. Unnatural or deceptive wording.

Return ONLY valid JSON using this exact structure:

{
    "score": 0,
    "issues": [],
    "suggestions": []
}

Rules:
- Score must be an integer between 0 and 100.
- 0 means very low spam-like risk.
- 100 means very high spam-like risk.
- Issues must be an array of strings.
- Suggestions must be an array of strings.
- Do not claim that an email will definitely be delivered to spam.
- This is only a content-based risk assessment.
`;

    const response = await generateWithGroq(prompt);
    const analysis = parseAIJson(response);

    const score = Number(analysis.score);

    if (
        !Number.isFinite(score) ||
        score < 0 ||
        score > 100 ||
        !Array.isArray(analysis.issues) ||
        !Array.isArray(analysis.suggestions)
    ) {
        throw new Error("AI returned an invalid spam analysis.");
    }

    return {
        score: Math.round(score),
        issues: analysis.issues.map(String),
        suggestions: analysis.suggestions.map(String)
    };
}


// Generate account-level campaign insights with Groq
async function generateInsights(metrics) {
    const prompt = `
You are an email marketing analyst. Review the following account metrics:
${JSON.stringify(metrics, null, 2)}

Generate exactly three concise, useful insights:
1. Campaign Performance
2. Subscriber Health
3. Recommendation

Use only the supplied metrics. Do not invent open rates, click rates, delivery rates,
revenue, or other data that is not provided.

Return ONLY valid JSON in this exact format:
{
  "insights": [
    { "label": "Campaign Performance", "text": "..." },
    { "label": "Subscriber Health", "text": "..." },
    { "label": "Recommendation", "text": "..." }
  ]
}

Each text should be 1-2 short sentences.
`;
    const response = await generateWithGroq(prompt);
    const parsed = parseAIJson(response);

    const allowedLabels = [
        "Campaign Performance",
        "Subscriber Health",
        "Recommendation"
    ];

    if (
        !Array.isArray(parsed.insights) ||
        parsed.insights.length !== 3 ||
        parsed.insights.some((item, index) =>
            !item ||
            item.label !== allowedLabels[index] ||
            typeof item.text !== "string" ||
            !item.text.trim()
        )
    ) {
        throw new Error("Groq returned an invalid insights response.");
    }

    return {
        insights: parsed.insights.map((item) => ({
            label: item.label,
            text: item.text.trim()
        }))
    };
}

module.exports = {
    generateEmail,
    analyzeSpamRiskWithAI,
    generateInsights
};
