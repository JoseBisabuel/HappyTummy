const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// 1. Configuración de la IA
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// IMPORTANTE: Si gemini-1.5-flash sigue dando 404, 
// es un problema de actualización de librería (ejecuta: npm install @google/generative-ai)
// Cambia la inicialización del modelo por esta:
const model = genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
}, { apiVersion: 'v1beta' }); // Forzamos explícitamente la versión de la API aquí

const systemPrompt = `Eres el asistente experto de la tienda vegana Vitalis (Happy Tummy). 
Responde de forma amable y humana.

NUESTROS PRODUCTOS:
- Avena x 500grs: $8.000.
- Psyllium x 100grs: $15.000.
- Linaza Mix x 450grs: $20.000.

Web: https://happytummy.vercel.app/`;

module.exports = async (req, res) => {
    // 2. Verificación para Meta
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode === "subscribe" && token === "vitalis123") {
            return res.status(200).send(challenge);
        }
        return res.status(403).send("Error de verificación");
    }

    // 3. Recepción de mensajes (POST)
    if (req.method === "POST") {
        try {
            const body = req.body;
            const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

            if (message && message.type === "text") {
                const customerPhone = message.from;
                const customerText = message.text.body;

                let botReply;
                try {
                    // Generamos contenido uniendo el sistema con la duda del cliente
                    const result = await model.generateContent(`${systemPrompt}\n\nCliente: ${customerText}`);
                    botReply = result.response.text();
                } catch (aiError) {
                    console.error("Fallo Gemini:", aiError.message);
                    // Respuesta de respaldo si falla la IA (429 o 404)
                    botReply = "¡Hola! Estamos recibiendo muchas consultas. Por favor, escríbenos de nuevo en unos segundos o visita nuestra web.";
                }

                // --- RESPONDER A WHATSAPP ---
                await axios({
                    method: "POST",
                    url: `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
                    headers: { "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}` },
                    data: {
                        messaging_product: "whatsapp",
                        to: customerPhone,
                        text: { body: botReply }
                    }
                });
            }
            res.status(200).send("EVENT_RECEIVED");
        } catch (error) {
            console.error("Error General:", error.message);
            res.status(500).send("Error interno");
        }
    } else {
        res.status(405).send("Método no permitido");
    }
};
