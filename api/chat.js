const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// Cargamos el catálogo
const productosData = require("./productos.json");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const model = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `Eres "Vitalis", el asistente virtual de Happy Tummy en Neiva. 
  Tu misión es ayudar a los clientes con información del catálogo.
  
  REGLAS DE ORO:
  1. Usa solo los productos del catálogo enviado.
  2. Si el precio es 0, di que está "Temporalmente Agotado".
  3. Responde de forma amable, saludable y breve.
  4. Si no encuentras algo, invita a revisar la web: https://happytummy.vercel.app/`
});

module.exports = async (req, res) => {
  // --- VERIFICACIÓN WEBHOOK (GET) ---
  if (req.method === "GET") {
    const token = req.query["hub.verify_token"];
    const challenge = req.query["hub.challenge"];
    if (token === "vitalis123") return res.status(200).send(challenge);
    return res.status(403).send("Error de token");
  }

  // --- PROCESAMIENTO DE MENSAJES (POST) ---
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      if (message && message.type === "text") {
        const customerPhone = message.from;
        const customerText = message.text.body;

        let botReply;
        try {
          // Simplificamos el JSON para que la IA no reciba datos innecesarios (como rutas de imágenes)
          // Esto ahorra espacio y evita errores de lectura
          const catalogoResumido = JSON.stringify(productosData);

          const promptFinal = `
            CATÁLOGO VITALIS:
            ${catalogoResumido}

            CLIENTE PREGUNTA: "${customerText}"
            
            Instrucción: Busca en todas las categorías (semillas, granolas, panadería, etc.) y responde.
          `;

          const result = await model.generateContent(promptFinal);
          botReply = result.response.text();

        } catch (aiError) {
          console.error("Error en Gemini:", aiError.message);
          botReply = "¡Hola! 🌱 Soy Vitalis. En este momento no puedo acceder a la lista de precios, pero puedes verlos todos en nuestra web: https://happytummy.vercel.app/";
        }

        // --- ENVIAR RESPUESTA A WHATSAPP ---
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

      return res.status(200).send("EVENT_RECEIVED");
    } catch (error) {
      console.error("Error General:", error.response ? error.response.data : error.message);
      return res.status(500).send("Error interno");
    }
  }
};
