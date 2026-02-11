const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// 1. Inicialización ultra-compatible
// Asegúrate de que en Vercel la variable se llame exactamente GEMINI_API_KEY
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Usaremos un bloque try/catch preventivo para el modelo
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const VITALIS_CONTEXT = `Eres el asistente de Vitalis. 
Productos: Avena ($8.000), Psyllium ($15.000), Linaza ($20.000). 
Web: https://happytummy.vercel.app/`;

module.exports = async (req, res) => {
    // Verificación Webhook
    if (req.method === "GET") {
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (token === "vitalis123") return res.status(200).send(challenge);
        return res.status(403).send("Error");
    }

    if (req.method === "POST") {
        try {
            const entry = req.body.entry?.[0]?.changes?.[0]?.value;
            const message = entry?.messages?.[0];

            if (message && message.type === "text") {
                const customerPhone = message.from;
                const customerText = message.text.body;

                let botReply;
                try {
                    // Generación de contenido
                    const prompt = `${VITALIS_CONTEXT}\n\nCliente: ${customerText}\nRespuesta:`;
                    const result = await model.generateContent(prompt);
                    botReply = result.response.text();
                } catch (aiError) {
                    console.error("Fallo IA:", aiError.message);
                    // Si falla la IA por cuota o auth, respondemos algo humano
                    botReply = "¡Hola! Estamos recibiendo muchos mensajes. ¿En qué puedo ayudarte hoy? También puedes ver precios en https://happytummy.vercel.app/";
                }

                // --- RESPUESTA A WHATSAPP ---
                // Aquí el 401 puede venir de Meta si el WHATSAPP_TOKEN está mal
                await axios({
                    method: "POST",
                    url: `https://graph.facebook.com/v21.0/${process.env.PHONE_NUMBER_ID}/messages`,
                    headers: { 
                        "Authorization": `Bearer ${process.env.WHATSAPP_TOKEN}`,
                        "Content-Type": "application/json"
                    },
                    data: {
                        messaging_product: "whatsapp",
                        to: customerPhone,
                        type: "text",
                        text: { body: botReply }
                    }
                });
            }
            res.status(200).send("OK");
        } catch (error) {
            // El error 401 viene de aquí si Axios falla
            console.error("Error en proceso:", error.response ? error.response.data : error.message);
            res.status(500).send("Error");
        }
    }
};
