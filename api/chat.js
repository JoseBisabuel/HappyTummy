const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// SOLO UNA VEZ: Usamos ../ para subir de la carpeta 'api' a la raíz
const productos = require("../productos.json"); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `Eres "Vitalis", el asistente de la tienda Happy Tummy. 
    Tu objetivo es ayudar con información basada en el catálogo. 
    Sé amable, breve y usa emojis saludables 🌱.`
});

module.exports = async (req, res) => {
    // 1. Verificación para Meta (Webhook)
    if (req.method === "GET") {
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];
        if (token === "vitalis123") return res.status(200).send(challenge);
        return res.status(403).send("Error");
    }

    // 2. Recepción de mensajes (POST)
    if (req.method === "POST") {
        try {
            const entry = req.body.entry?.[0]?.changes?.[0]?.value;
            const message = entry?.messages?.[0];

            if (message && message.type === "text") {
                const customerPhone = message.from;
                const customerText = message.text.body;

                let botReply;
                try {
                    // Convertimos el JSON cargado arriba a texto para la IA
                    const catalogoTexto = JSON.stringify(productos, null, 2);
                    
                    const promptFinal = `
                        CATÁLOGO DE PRODUCTOS:
                        ${catalogoTexto}

                        PREGUNTA DEL CLIENTE:
                        ${customerText}

                        Respuesta basada en el catálogo:
                    `;

                    const result = await model.generateContent(promptFinal);
                    botReply = result.response.text();
                } catch (aiError) {
                    console.error("Fallo IA:", aiError.message);
                    botReply = "¡Hola! 🌱 En este momento no puedo consultar el catálogo, pero puedes ver todo en https://happytummy.vercel.app/";
                }

                // --- RESPUESTA A WHATSAPP ---
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
                        text: { body: botReply }
                    }
                });
            }
            res.status(200).send("OK");
        } catch (error) {
            console.error("Error en proceso:", error.response ? error.response.data : error.message);
            res.status(500).send("Error");
        }
    }
};
