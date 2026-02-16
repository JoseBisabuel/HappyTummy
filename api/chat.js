const { GoogleGenerativeAI } = require("@google/generative-ai");
const axios = require("axios");

// 1. CARGA DEL CATÁLOGO
let productos;
try {
  productos = require("./productos.json");
} catch (e) {
  console.error("Error al cargar productos.json:", e.message);
}

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 2. CONFIGURACIÓN DEL MODELO (Asegúrate de usar 1.5-flash)
const model = genAI.getGenerativeModel({
  model: "gemini-3-flash", 
});

module.exports = async (req, res) => {

  // --- VERIFICACIÓN WEBHOOK (GET) ---
  if (req.method === "GET") {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === "vitalis123") {
    console.log("Webhook verificado correctamente");
    return res.status(200).send(challenge);
  }

  return res.status(403).send("Error de verificación");
}


  // --- PROCESAMIENTO DE MENSAJES (POST) ---
  if (req.method === "POST") {
    try {
      const entry = req.body.entry?.[0]?.changes?.[0]?.value;
      const message = entry?.messages?.[0];

      // Verificamos que sea un mensaje de texto para no procesar "leídos" o "entregados"
      if (message?.type === "text" && message?.text?.body) {
        const customerPhone = message.from;
        const customerText = message.text.body;

        let botReply;

        if (!productos) {
          botReply = "¡Hola! 🌱 Estamos actualizando el catálogo. Visítanos en: https://happytummy.vercel.app/";
        } else {
          try {
            // Formatear el catálogo para la IA
            const catalogoTexto = Object.keys(productos).map(categoria => {
              return `--- ${categoria} ---\n` + productos[categoria].map(p => `- ${p.nombre}: $${p.precio}`).join("\n");
            }).join("\n\n");

            // --- AQUÍ ESTÁ TU PROMPT COMPLETO ---
            const promptFinal = `Eres Vitalis, el asistente de la tienda "Happy Tummy" en Neiva.
            
            INFORMACIÓN DE LA TIENDA:
            - Ubicación: Calle 15 # 5-20, Barrio Centro, Neiva (Ajusta con tu dirección real).
            - Horarios: Lunes a Sábado de 8:00 AM a 7:00 PM.
            - Web: https://happytummy.vercel.app/
            - Domicilios: Hacemos envíos en toda Neiva.

            REGLAS DE COMPORTAMIENTO:
            1. SALUDO: Solo di "Hola, soy Vitalis" si el cliente te está saludando por primera vez. Si es una continuación, no te presentes de nuevo.
            2. CIERRE DE VENTA: Si el cliente dice que quiere comprar, desea un producto o dice "sí" a una compra, responde: "¡Excelente elección! 📝 Para procesar tu pedido, por favor confíame tu nombre completo, dirección en Neiva y un número de contacto."
            3. BREVEDAD: No hagas listas gigantes a menos que te lo pidan. Sé amable y usa emojis de plantas o comida saludable.

            CATÁLOGO DISPONIBLE:
            ${catalogoTexto}

            MENSAJE DEL CLIENTE: "${customerText}"
            RESPUESTA VITALIS:`;

            const result = await model.generateContent(promptFinal);
            botReply = result.response.text();

          } catch (aiError) {
            console.error("Error en Gemini:", aiError);
            botReply = "Lo siento, tuve un pequeño problema técnico. ¿Podrías repetirme tu duda? 🌱";
          }
        }

        // --- ENVÍO A WHATSAPP ---
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

      // IMPORTANTE: Siempre responder 200 a Meta
      return res.status(200).send("OK");

    } catch (error) {
      console.error("Error detallado:", error.response?.data || error.message);
      // Aunque falle, enviamos 200 para que el webhook de WhatsApp no se bloquee reintentando
      return res.status(200).send("Error procesado");
    }
  }
};
