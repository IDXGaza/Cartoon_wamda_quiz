import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = parseInt(process.env.PORT || "8080");

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

app.post("/api/ask", async (req, res) => {
  const { prompt, model } = req.body;
  const apiKey = process.env.OPENROUTER_KEY;

  console.log("--- /api/ask request received ---");
  console.log("Prompt length:", prompt?.length);
  
  if (!apiKey) {
    console.error("OpenRouter API key missing");
    return res.status(500).json({ error: "OpenRouter API key not configured" });
  }

  try {
    console.info("Calling OpenRouter API...");
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://ais-dev-eiamvsyls5orbfmjbujxi7-196113868583.europe-west1.run.app", 
        "X-Title": "Wamda App",
      },
      body: JSON.stringify({
        model: model || "tencent/hy3-preview:free",
        messages: [
          { role: "user", content: prompt }
        ],
      }),
    });

    const responseText = await response.text();
    console.info("OpenRouter response status:", response.status);
    console.info("OpenRouter response body:", responseText.substring(0, 500)); // Log first 500 chars

    if (!response.ok) {
      console.error("OpenRouter API error response:", response.status, responseText);
      return res.status(response.status).json({ error: "OpenRouter API failed", details: responseText });
    }

    const data = JSON.parse(responseText);
    console.info("OpenRouter API success");
    return res.json(data);
  } catch (error: any) {
    console.error("OpenRouter API Exception:", error);
    return res.status(500).json({ error: error.message });
  }
});

app.post("/api/generate-questions", async (req, res) => {
  const { promptText, model, apiKeys, systemInstruction } = req.body;

  try {
    const key = apiKeys?.gemini || process.env.GEMINI_API_KEY;
    
    if (!key) {
      return res.status(400).json({ error: "Missing Gemini API key" });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: key });

    const result = await genAI.models.generateContent({
      model: model || "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: {
        systemInstruction: systemInstruction || undefined,
        responseMimeType: "application/json",
      }
    });

    const text = result.text || "";
    return res.json({ text });
  } catch (error: any) {
    console.error("Internal API Error:", error);
    return res.status(500).json({ error: error.message });
  }
});

async function startServer() {
  console.log("--- Server Startup ---");
  console.log("NODE_ENV:", process.env.NODE_ENV);
  console.log("CWD:", process.cwd());
  
  const distPath = path.join(process.cwd(), "dist");

  if (process.env.NODE_ENV !== "production") {
    console.log("Mode: Development (Vite)");
    try {
      const { createServer: createViteServer } = await import("vite");
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: "spa",
      });
      app.use(vite.middlewares);
      console.log("Vite middleware attached");
    } catch (err) {
      console.error("Failed to load Vite:", err);
    }
  } else {
    console.log("Mode: Production (Static)");
    console.log("Dist Path for static:", distPath);
    
    // Serve static files
    app.use(express.static(distPath));

    // Fallback index.html for all other request
    app.get("/*", (req, res) => {
      res.sendFile(path.resolve(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is listening on 0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error("FATAL: Server failed to start:", err);
  process.exit(1);
});
