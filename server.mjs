
import express from "express";
import dotenv from "dotenv";
import OpenAI from "openai";
import rateLimit from "express-rate-limit";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const app = express();

// Configuração para funcionar corretamente atrás do proxy do Render
app.set("trust proxy", 1);

const PORT = process.env.PORT || 3000;

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json({ limit: "1mb" }));
app.use(express.static(path.join(__dirname, "public")));

// Verificação da chave da Groq
if (!process.env.GROQ_API_KEY) {
  console.error("ERRO: configure GROQ_API_KEY no ambiente do servidor.");
  process.exit(1);
}

// Conexão com a API da Groq
const groq = new OpenAI({
  apiKey: process.env.GROQ_API_KEY,
  baseURL: "https://api.groq.com/openai/v1"
});

// Modelo padrão atualizado
const MODEL =
  process.env.GROQ_MODEL || "openai/gpt-oss-120b";

/*
  MATERIAL OFICIAL DO TRABALHO
  Este conteúdo é enviado ao modelo em TODA pergunta.
*/

const studyContext = `
Você é o Tutor IA de um trabalho escolar de Biologia do 9º ano C,
preparado para a Prô Evelyn.

O assunto do trabalho é TEMA 1 – TRANSGÊNICOS.
O material de referência é o livro didático de Biologia,
páginas 28, 30 e 31.

REGRA FUNDAMENTAL:
Você já sabe qual é o livro e já recebeu o conteúdo estudado.
NUNCA pergunte qual é o título ou o autor do livro.
NUNCA diga que não sabe a qual livro o aluno está se referindo.
Use o material abaixo como referência principal.

==============================
PÁGINA 28 – O QUE SÃO TRANSGÊNICOS?
==============================

- Transgênicos são organismos que receberam um ou mais genes de outra espécie.
- Ao incorporar esse gene ao seu genoma, o organismo pode expressar uma característica determinada por ele.
- A transferência de genes geralmente acontece artificialmente, por meio de técnicas de manipulação genética.
- A incorporação de um gene de uma espécie no genoma de outra é chamada de recombinação gênica ou DNA recombinante.
- Exemplo: um gene de água-viva relacionado à bioluminescência foi inserido em células de coelho, fazendo o animal brilhar sob uma luz especial.
- Para que um organismo seja considerado transgênico, todas ou quase todas as suas células devem carregar o transgene.
- O gene pode estar presente nos gametas e ser transmitido aos descendentes.
- O DNA dos seres vivos tem a mesma composição estrutural, mas isso não garante que a técnica funcione em qualquer experimento ou espécie.

==============================
PÁGINA 30 – PRODUÇÃO, COMERCIALIZAÇÃO E CONSUMO
==============================

- Os primeiros organismos transgênicos agrícolas foram desenvolvidos para apresentar resistência a agrotóxicos, pragas e variações ambientais.
- Também foram desenvolvidos para retardar o amadurecimento e aumentar o tempo de armazenamento.
- Exemplos de vegetais modificados: soja, milho, trigo, tomate, mamão, melão, abobrinha, feijão e banana.
- Posteriormente, buscou-se produzir alimentos maiores, mais vistosos, saborosos e com maior valor nutricional.
- O arroz-dourado produz betacaroteno, substância precursora da vitamina A.
- No Brasil, a CTNBio fiscaliza a biossegurança dos organismos transgênicos.
- O livro menciona a obrigatoriedade de um símbolo nas embalagens de produtos constituídos por mais de 1% de organismos transgênicos ou derivados.
- O livro informa que estudos científicos recentes não apresentam indícios de que o consumo de transgênicos faça mal à saúde.

IMPACTOS AMBIENTAIS CITADOS NO LIVRO:

1. Perda de variabilidade genética e de organismos naturais.
2. Monopólio de empresas produtoras de sementes, fazendo com que produtores precisem comprar sementes.
3. Alteração de características naturais dos alimentos, como o sabor.
4. Poluição gênica: transferência de genes entre espécies transgênicas e não transgênicas.
5. Surgimento de ervas daninhas e insetos super-resistentes.
6. Aumento do uso de agroquímicos para tentar eliminar ervas daninhas e insetos resistentes.
7. Perda de insetos polinizadores.
8. Desequilíbrio ecológico.
9. Alterações na cadeia alimentar.
10. Diminuição da biodiversidade.

==============================
PÁGINA 31 – OUTRAS APLICAÇÕES
==============================

- Bactérias transgênicas podem decompor plástico e produzir compostos utilizados em plásticos biodegradáveis.
- Mosquitos transgênicos podem produzir larvas incapazes de se desenvolver até a fase adulta, sendo estudados no combate a doenças como dengue e malária.
- Bactérias transgênicas podem produzir hormônio do crescimento bovino, utilizado para aumentar a produção de leite.
- Peixes GloFish receberam genes relacionados à fluorescência e podem brilhar.
- Plantas também podem receber genes relacionados à bioluminescência.

==============================
REGRAS PARA AS RESPOSTAS
==============================

1. Responda em português brasileiro.
2. Use linguagem simples, clara e adequada ao 9º ano.
3. Responda diretamente à pergunta antes de acrescentar explicações.
4. Quando o aluno perguntar "segundo o livro", "de acordo com o livro" ou "no material", use as informações deste contexto.
5. Se perguntarem sobre impactos ambientais, apresente os impactos listados acima. Não peça o título do livro.
6. Não invente informações e não atribua ao livro algo que não esteja neste conteúdo.
7. Se a pergunta for sobre algo que não aparece nas páginas estudadas, explique isso claramente. Você pode oferecer uma explicação adicional, mas identifique-a como conhecimento complementar.
8. Ajude o aluno a estudar, revisar e se preparar para a prova.
9. Quando for útil, dê exemplos simples.
10. Não fuja do tema de transgênicos, DNA recombinante e suas aplicações.

EXEMPLO DE COMPORTAMENTO OBRIGATÓRIO:

Pergunta: "Quais são os impactos ambientais citados no livro?"

Resposta esperada:
"Segundo o livro, os impactos ambientais incluem perda de variabilidade genética, monopólio de empresas produtoras de sementes, alteração de características naturais dos alimentos, poluição gênica, surgimento de ervas daninhas e insetos super-resistentes, aumento do uso de agroquímicos, perda de insetos polinizadores, desequilíbrio ecológico, alterações na cadeia alimentar e diminuição da biodiversidade."

Nunca responda perguntando qual é o livro.
`;

// Limite de mensagens para evitar excesso de requisições
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: {
    error: "Muitas mensagens em pouco tempo. Aguarde um minuto e tente novamente."
  }
});

// Página inicial
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Verificação do servidor
app.get("/api/status", (req, res) => {
  res.json({
    online: true,
    model: MODEL,
    tutor: "Transgênicos – Biologia 9º ano"
  });
});

// Tutor IA
app.post("/api/chat", chatLimiter, async (req, res) => {
  try {
    const { question, history = [] } = req.body || {};

    if (
      !question ||
      typeof question !== "string" ||
      !question.trim()
    ) {
      return res.status(400).json({
        error: "Digite uma pergunta antes de enviar."
      });
    }

    if (question.length > 3000) {
      return res.status(400).json({
        error: "Sua pergunta é muito longa. Tente resumir."
      });
    }

    // Aceita somente mensagens anteriores de usuário e assistente.
    const safeHistory = Array.isArray(history)
      ? history
          .filter(
            (message) =>
              message &&
              ["user", "assistant"].includes(message.role) &&
              typeof message.content === "string"
          )
          .slice(-20)
          .map((message) => ({
            role: message.role,
            content: message.content.slice(0, 4000)
          }))
      : [];

    const messages = [
      {
        role: "system",
        content: studyContext
      },
      ...safeHistory,
      {
        role: "user",
        content: question.trim()
      }
    ];

    const completion = await groq.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.3,
      max_tokens: 1200
    });

    const answer =
      completion.choices?.[0]?.message?.content?.trim();

    if (!answer) {
      throw new Error("A IA não retornou uma resposta.");
    }

    return res.json({ answer });

  } catch (error) {
    console.error("Erro no Tutor IA:", error);

    if (error.status === 429) {
      return res.status(429).json({
        error: "A IA está recebendo muitas solicitações. Tente novamente em instantes."
      });
    }

    if (error.status === 401 || error.status === 403) {
      return res.status(500).json({
        error: "Não foi possível autenticar a API da Groq. Verifique a configuração da chave no Render."
      });
    }

    if (error.status === 404) {
      return res.status(500).json({
        error: "O modelo configurado não está disponível na Groq. Verifique GROQ_MODEL no Render."
      });
    }

    return res.status(500).json({
      error: "Não foi possível obter uma resposta agora. Verifique o servidor e tente novamente."
    });
  }
});

// Inicialização do servidor
app.listen(PORT, "0.0.0.0", () => {
  console.log("--------------------------------------");
  console.log(" TUTOR IA - TRANSGÊNICOS");
  console.log("--------------------------------------");
  console.log(`Servidor rodando na porta ${PORT}`);
  console.log(`Modelo: ${MODEL}`);
  console.log("Conteúdo do livro carregado no backend.");
});
