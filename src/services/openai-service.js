import { config, isOpenAiConfigured } from "../config.js";

function cleanKeyword(keyword) {
  return String(keyword || "").trim();
}

function buildFallbackReply({ review, settings, businessProfile }) {
  const tone = String(settings.tone || "Professional").toLowerCase();
  const hasLowRating = review.rating <= 3;
  const keywords = (settings.seoKeywords || []).map(cleanKeyword).filter(Boolean).slice(0, 2);
  const intro =
    tone === "friendly"
      ? `Oi ${review.customerName}, muito obrigado por compartilhar sua experiencia.`
      : tone === "enthusiastic"
        ? `Olá ${review.customerName}, muito obrigado pela sua avaliacao e pelo tempo em escrever para a gente.`
        : tone === "formal"
          ? `Olá ${review.customerName}, agradecemos sinceramente pelo seu feedback.`
          : `Olá ${review.customerName}, obrigado pela sua avaliacao.`;

  const body = hasLowRating
    ? `Sentimos que sua experiencia com a ${businessProfile.businessName} nao foi ideal. Vamos revisar internamente o que aconteceu e nossa equipe esta disponivel para continuar essa conversa de forma direta e resolver rapidamente.`
    : `Ficamos felizes em saber que sua experiencia com a ${businessProfile.businessName} foi positiva. Nosso time trabalha para manter um atendimento atencioso, eficiente e alinhado com o que clientes locais esperam de um servico de confiança.`;

  const seoSentence = keywords.length
    ? ` Seguimos comprometidos em oferecer ${keywords.join(" e ")} para a nossa comunidade local.`
    : "";

  const customSentence = settings.customInstructions
    ? ` ${String(settings.customInstructions).split(".")[0].trim().replace(/\.*$/, ".")}`
    : "";

  return `${intro} ${body}${seoSentence}${customSentence}`.replace(/\s+/g, " ").trim();
}

export async function generateReviewReply({ review, settings, businessProfile }) {
  if (!isOpenAiConfigured()) {
    return buildFallbackReply({ review, settings, businessProfile });
  }

  const systemPrompt = [
    "Voce escreve respostas curtas e elegantes para reviews de pequenos negocios locais.",
    "Responda no idioma da avaliacao.",
    "Use um tom alinhado ao solicitado.",
    "Nao invente fatos, descontos nem promessas especificas.",
    "Se a nota for baixa, demonstre empatia e convide a continuar a conversa offline.",
    "Mantenha entre 55 e 110 palavras.",
  ].join(" ");

  const userPrompt = [
    `Negocio: ${businessProfile.businessName}.`,
    `Tom desejado: ${settings.tone}.`,
    `Instrucoes adicionais: ${settings.customInstructions || "Nenhuma"}.`,
    `Palavras-chave SEO: ${(settings.seoKeywords || []).join(", ") || "Nenhuma"}.`,
    `Cliente: ${review.customerName}.`,
    `Nota: ${review.rating} estrelas.`,
    `Avaliacao: ${review.comment}`,
  ].join("\n");

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.openAiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openAiModel,
        temperature: 0.6,
        max_tokens: 220,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI returned ${response.status}`);
    }

    const payload = await response.json();
    const content = payload.choices?.[0]?.message?.content?.trim();
    return content || buildFallbackReply({ review, settings, businessProfile });
  } catch (error) {
    console.warn("[openai] fallback reply used:", error.message);
    return buildFallbackReply({ review, settings, businessProfile });
  }
}

