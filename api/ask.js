export default async function handler(req, res) {
  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${process.env.OPENROUTER_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: "tencent/hy3-preview:free",
      messages: [
        { role: "user", content: req.body.prompt }
      ]
    })
  });
  const data = await response.json();
  res.json(data);
}
