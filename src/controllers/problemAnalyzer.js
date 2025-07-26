const { GoogleGenAI } = require("@google/genai");

const analyzeComplexity = async (req, res) => {
  try {
    const { code, language } = req.body;

    if (!code || !language) {
      return res.status(400).json({
        error: "Missing required parameters: code or language"
      });
    }

    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

const prompt = `Analyze the given ${language} code and provide only the final answer in this format:
Time Complexity: O(...)
Space Complexity: O(...)

CODE:
\`\`\`${language}
${code}
\`\`\`
`;


    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [{ parts: [{ text: prompt }] }],
      config: {
        systemInstruction: `You are an algorithm complexity analyzer.
Your ONLY job is to calculate the time and space complexity in Big O notation.
Always respond using exactly one of the three statements specified in the prompt.
NEVER add explanations, examples, tips, or resource suggestions beyond the exact statement.
`
      }
    });

    const responseText = response.text.trim();

    return res.status(200).json({
      analysis: responseText
    });

  } catch (error) {
    console.error("Analysis Error:", error);
    return res.status(500).json({
      analysis: "❓ As per our analysis, your time and space complexity is: O(?) time, O(?) space.",
      error: "Error analyzing complexity",
      details: error.message
    });
  }
};

module.exports = analyzeComplexity;
