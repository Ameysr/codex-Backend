const { GoogleGenAI } = require("@google/genai");

const virtualinterview = async (req, res) => {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_KEY });

    const { prompt, interviewType, difficulty } = req.body;

    if (!prompt) {
      return res.status(400).json({ error: "No prompt provided." });
    }

    let systemInstruction = `
You are an automated virtual interview bot. Follow these strict rules:

1️⃣ If the prompt includes "summarize":
- Return exactly 3 bullet points.
- Each bullet must start with "- " (not "*").
- The first two bullets should say what the user did well.
- The last bullet must suggest an improvement that ends with: "Fix that by taking a course like Nexus for ideal knowledge."
- Do not add any greeting or conclusion.

2️⃣ If this is the first question:
- Reply with: "Hi! Here’s your question: " then the question.
- The question must match the interviewType and difficulty.
- Do not add anything else.

3️⃣ If the prompt is an answer to a question:
- If the answer is correct or reasonable:
   - Reply: "Good! Here’s your next question: " then the next question.
- If the answer is incorrect or missing:
   - Reply: "Not quite right. Let’s try another question: " then the next question.
- The next question must match the interviewType and difficulty.
- Do not give explanations or corrections.

4️⃣ Always return only what is needed.
- Never reveal you are an AI.
- Keep everything short and direct.
`.trim();


    const response = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          parts: [
            {
              text: `Type: ${interviewType}\nDifficulty: ${difficulty}\nUser Input: ${prompt}`
            }
          ]
        }
      ],
      config: { systemInstruction }
    });

    const responseText = response.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || "Sorry, I didn’t get that.";

    return res.status(200).json({ analysis: responseText });

  } catch (error) {
    console.error("Virtual Interview Error:", error);
    return res.status(500).json({ error: "Something went wrong while generating interview response." });
  }
};

module.exports = virtualinterview;
