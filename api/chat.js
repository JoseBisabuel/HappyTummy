const productos = require("../productos.json"); // Asegúrate de que la ruta sea correcta
const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");
// 1. CARGAMOS TUS PRODUCTOS DESDE EL JSON
const productos = require("./productos.json"); 

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Configuramos el modelo (aquí no ponemos los productos para no saturar la config inicial)
const model = genAI.getGenerativeModel({ 
    model: "gemini-1.5-flash",
    systemInstruction: `Eres el asistente de Vitalis. Tu deber es informar sobre los productos usando EXCLUSIVAMENTE la lista que se te proporcionará. Si el producto no está en la lista, di que no está disponible.`
});

module.exports = async (req, res) => {
    // ... (Mantén tu código de verificación GET igual)

    if (req.method === "POST") {
        try {
            const entry = req.body.entry?.[0]?.changes?.[0]?.value;
            const message = entry?.messages?.[0];

            if (message && message.type === "text") {
                const customerPhone = message.from;
                const customerText = message.text.body;

                let botReply;
                try {
                    // 2. CONVERTIMOS EL JSON A TEXTO PARA LA IA
                    const catalogoTexto = JSON.stringify(productos, null, 2);
                    
                    // Creamos un prompt que combine el catálogo con la pregunta
                    const promptFinal = `
                        CATÁLOGO ACTUALIZADO:
                        ${catalogoTexto}

                        PREGUNTA DEL CLIENTE:
                        ${customerText}

                        Respuesta amable basada en el catálogo:
                    `;

                    const result = await model.generateContent(promptFinal);
                    botReply = result.response.text();
                } catch (aiError) {
                    console.error("Fallo IA:", aiError.message);
                    botReply = "Lo siento, tuve un problema al consultar el catálogo. Por favor intenta de nuevo.";
                }

                // --- RESPUESTA A WHATSAPP ---
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
            res.status(200).send("OK");
        } catch (error) {
            console.error("Error en proceso:", error.message);
            res.status(500).send("Error");
        }
    }
};
