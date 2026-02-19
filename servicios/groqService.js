/**
 * Servicio para llamar a la API de Groq con dos llaves (como dos pilas: una trabaja, la otra descansa).
 * - Si hay dos llaves: se alternan por petición (una atiende, la otra entra en reposo y recupera cuota).
 * - Si la llave que toca trabajar falla (límite, error), la que estaba en reposo toma el relevo.
 * La app Android no se entera; Railway/backend lo resuelve.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

/** Alternancia: petición par → key1, impar → key2 (reparto de carga). */
let _contadorPeticiones = 0;

async function llamarGroqConClave(apiKey, mensajes, opciones) {
  const response = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: opciones.modelo || 'openai/gpt-oss-120b',
      messages: mensajes,
      temperature: opciones.temperatura ?? 0.2,
      max_tokens: opciones.max_tokens ?? 4096,
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    const msg = data?.error?.message || 'Error Groq';
    throw new Error(msg);
  }

  return data?.choices?.[0]?.message?.content?.trim() || '';
}

async function llamarGroq(mensajes, opciones = {}) {
  const key1 = process.env.GROQ_API_KEY?.trim();
  const key2 = (process.env.GROQ_API_KEY_2 || process.env.CLAVE_DE_API_DE_GROQ_2 || process.env['CLAVE DE API DE GROQ 2'] || '').trim();
  const tieneDos = !!(key1 && key2);
  const keyPrincipal = key1 || key2;
  if (!keyPrincipal) {
    throw new Error('GROQ_API_KEY no configurada en el servidor');
  }

  const opts = {
    modelo: opciones.modelo || 'openai/gpt-oss-120b',
    temperatura: opciones.temperatura ?? 0.2,
    max_tokens: opciones.max_tokens ?? 4096,
  };

  if (!llamarGroq._loggedModel) {
    console.log('Groq request usando modelo:', opts.modelo);
    llamarGroq._loggedModel = true;
  }

  // Repartir carga: alternar llave (mientras una trabaja la otra descansa)
  let keyElegida = keyPrincipal;
  if (tieneDos) {
    _contadorPeticiones++;
    keyElegida = _contadorPeticiones % 2 === 1 ? key1 : key2;
  }

  try {
    return await llamarGroqConClave(keyElegida, mensajes, opts);
  } catch (e) {
    if (tieneDos) {
      const laOtra = keyElegida === key1 ? key2 : key1;
      console.log('La llave en uso falló, la que estaba en reposo toma el relevo...', e?.message || e);
      try {
        return await llamarGroqConClave(laOtra, mensajes, opts);
      } catch (e2) {
        throw e2;
      }
    }
    throw e;
  }
}

module.exports = { llamarGroq };
