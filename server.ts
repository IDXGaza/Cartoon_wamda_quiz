import express from "express";
import path from "path";
import fs from "fs";

const app = express();
const PORT = 3000;

app.use(express.json());

// API routes
app.get("/api/health", (req, res) => {
  res.json({ 
    status: "ok", 
    env: process.env.NODE_ENV,
    time: new Date().toISOString()
  });
});

app.post("/api/generate-questions", async (req, res) => {
  const { promptText, model, apiKeys } = req.body;

  try {
    const key = apiKeys?.gemini || process.env.GEMINI_API_KEY;
    
    if (!key) {
      return res.status(400).json({ error: "Missing Gemini API key" });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const genAI = new GoogleGenAI({ apiKey: key });

    // In @google/genai SDK, generation is done via genAI.models.generateContent
    const result = await genAI.models.generateContent({
      model: model || "gemini-1.5-flash",
      contents: [{ role: "user", parts: [{ text: promptText }] }],
      config: {
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
    console.log("Dist Path:", distPath);
    
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      console.log("Static middleware attached");
    } else {
      console.error("WARNING: Dist folder not found!");
    }

    app.get("*all", (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: "API route not found" });
      }
      
      const indexPath = path.join(distPath, "index.html");
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(404).send(`
          <h1>404 - Not Found</h1>
          <p>The application build artifacts were not found.</p>
          <p>Path: ${indexPath}</p>
        `);
      }
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
