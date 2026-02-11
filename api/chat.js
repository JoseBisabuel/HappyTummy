const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

module.exports = async (req, res) => {
    // 1. Verificación para Meta (Para configurar el Webhook)
    if (req.method === "GET") {
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        if (mode === "subscribe" && token === "vitalis123") {
            return res.status(200).send(challenge);
        }
        return res.status(403).send("Error de verificación");
    }

    // 2. Recepción de mensajes (POST)
    if (req.method === "POST") {
        try {
            const body = req.body;
            const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

            if (message && message.type === "text") {
                const customerPhone = message.from;
                const customerText = message.text.body;

                // --- LLAMADA A LA IA (Usamos las variables de Vercel) ---
                // --- LLAMADA A LA IA ---
                const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
                
                // Cambiamos a 'gemini-1.5-pro', que suele estar más disponible
                const model = genAI.getGenerativeModel(
                    { model: "gemini-1.5-pro" }, 
                    { apiVersion: 'v1' }
                );
                
                const prompt = `Eres el asistente experto de la tienda vegana Vitalis (Happy Tummy). 
                Responde de forma amable y humana.
                
                NUESTROS PRODUCTOS:
                - Avena x 500grs: $8.000. Tip: Ideal para desayunos 'Overnight oats'.
                - Psyllium x 100grs: $15.000. Uso: Mezclar en agua para digestión.
                - Linaza Mix x 450grs: $20.000. Receta: Úsala como 'huevo vegano' mezclando 1 cda con 3 de agua.
                
                Si preguntan por ubicación o contacto, usa la info de tu web: https://happytummy.vercel.app/
                
                Cliente dice: ${customerText}`;

                const result = await model.generateContent(prompt);
                const response = await result.response;
                const botReply = response.text();

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
            console.error("Error:", error.response ? error.response.data : error.message);
            res.status(500).send("Error interno");
        }
    }
};
