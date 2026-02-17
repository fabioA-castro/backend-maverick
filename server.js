/**
 * Backend mínimo para Presupuestos Kontry + Groq.
 * La app Android NO guarda la API Key: llama a esta URL con el prompt;
 * este servidor guarda GROQ_API_KEY y llama a Groq.
 *
 * Despliega en Railway, Render, Vercel, etc. y configura GROQ_API_KEY como variable de entorno.
 * En la app: Ajustes → URL del backend (Groq) → https://tu-app.onrender.com/completar
 */

const express = require('express');
const app = express();
app.use(express.json());

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = 'llama-3.3-70b-versatile';

app.post('/completar', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY no configurada en el servidor' });
  }
  const prompt = req.body?.prompt;
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).json({ error: 'Falta el campo "prompt" en el body' });
  }
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 1024,
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || 'Error Groq' });
    }
    const text = data?.choices?.[0]?.message?.content?.trim() || '';
    res.json({ text });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message || 'Error al llamar a Groq' });
  }
});

// Health check para Railway/Render
app.get('/', (req, res) => {
  res.json({ ok: true, message: 'Backend Groq para Presupuestos Kontry. POST /completar con { "prompt": "..." }' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor en puerto ${PORT}. Endpoint: POST /completar`);
});
