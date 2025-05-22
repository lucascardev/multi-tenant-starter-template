// src/app/api/webhook-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosRequestConfig, AxiosError, isAxiosError } from 'axios';
import https from 'https'; // Importa o módulo https do Node.js

const TARGET_BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_RECEIVER_URL;

const logger = {
    info: (...args: any[]) => console.log("[PROXY INFO]", ...args),
    warn: (...args: any[]) => console.warn("[PROXY WARN]", ...args),
    error: (...args: any[]) => console.error("[PROXY ERROR]", ...args),
    debug: (...args: any[]) => console.log("[PROXY DEBUG]", ...args),
};

if (!TARGET_BACKEND_WEBHOOK_URL && process.env.NODE_ENV !== 'test') {
    logger.error("Variável BACKEND_WEBHOOK_RECEIVER_URL não definida!");
}

// Crie um agente https que ignore erros de certificado autoassinado
// ATENÇÃO: ISSO É INSEGURO E SÓ DEVE SER USADO EM AMBIENTES DE DESENVOLVIMENTO CONTROLADOS
// ONDE VOCÊ CONFIA NO ENDPOINT DE DESTINO.
const insecureHttpsAgent = new https.Agent({
  rejectUnauthorized: false, // A CHAVE PARA IGNORAR ERROS DE CERTIFICADO
});

export async function POST(request: NextRequest) {
  logger.info(`Webhook recebido em ${request.url}. Endpoint do backend: ${TARGET_BACKEND_WEBHOOK_URL}`);

  if (!TARGET_BACKEND_WEBHOOK_URL) {
    logger.error("URL do backend de destino não configurada.");
    return NextResponse.json({ message: "Erro de configuração interna do proxy." }, { status: 503 });
  }

  let rawBody: Buffer;
  try {
    const requestBodyArrayBuffer = await request.arrayBuffer();
    rawBody = Buffer.from(requestBodyArrayBuffer);
  } catch (err: any) {
    logger.error("Erro ao ler corpo da requisição original:", err.message);
    return NextResponse.json({ message: "Falha ao ler corpo da requisição." }, { status: 400 });
  }

  const originalHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    originalHeaders[key.toLowerCase()] = value;
  });

  const headersForBackend: Record<string, string> = {
    'content-type': originalHeaders['content-type'] || 'application/json',
  };
  if (originalHeaders['svix-id']) headersForBackend['svix-id'] = originalHeaders['svix-id'];
  if (originalHeaders['svix-timestamp']) headersForBackend['svix-timestamp'] = originalHeaders['svix-timestamp'];
  if (originalHeaders['svix-signature']) headersForBackend['svix-signature'] = originalHeaders['svix-signature'];

  try {
    logger.info(`Encaminhando webhook para: ${TARGET_BACKEND_WEBHOOK_URL}`);
    const axiosConfig: AxiosRequestConfig = {
      method: 'POST',
      url: TARGET_BACKEND_WEBHOOK_URL,
      headers: headersForBackend,
      data: rawBody,
      timeout: 25000,
      responseType: 'text',
      // Adiciona o agente https para ignorar erros de certificado SSL
      // Verifique se o TARGET_BACKEND_WEBHOOK_URL realmente começa com https://
      httpsAgent: TARGET_BACKEND_WEBHOOK_URL.startsWith('https://') ? insecureHttpsAgent : undefined,
    };

    // Log antes da chamada para ter certeza que está sendo tentada
    logger.debug("PROXY: Configuração Axios para backend:", { url: axiosConfig.url, method: axiosConfig.method, headers: axiosConfig.headers ? Object.keys(axiosConfig.headers) : 'N/A', usesInsecureAgent: !!axiosConfig.httpsAgent });


    const backendResponse = await axios(axiosConfig);
    logger.info(`Resposta do backend Express - Status: ${backendResponse.status}`);

    const responseHeaders = new Headers();
    responseHeaders.set('Content-Type', backendResponse.headers['content-type'] || 'application/json');

    // Para o Svix, um 2xx é sucesso. Se seu backend respondeu 2xx, ótimo.
    // Se seu backend respondeu 4xx/5xx (ex: falha na verificação Svix lá),
    // o Svix marcará como falha, o que é o comportamento correto.
    // O objetivo aqui é garantir que o proxy consiga *comunicar* com o backend.
    return new NextResponse(backendResponse.data, {
        status: backendResponse.status, // Repassa o status do backend
        headers: responseHeaders,
    });

  } catch (error: any) {
    logger.error("PROXY: ERRO GERAL AO ENCAMINHAR/PROCESSAR:", error.message);
    if (isAxiosError(error)) {
      const axiosError = error as AxiosError<any>;
      logger.error("PROXY: Detalhes do ERRO AXIOS:", {
        message: axiosError.message, // Esta mensagem deve incluir "self-signed certificate" se for o caso
        code: axiosError.code,
        url: axiosError.config?.url,
        status: axiosError.response?.status,
        responseData: axiosError.response?.data ? String(axiosError.response.data).substring(0,500) : "Sem dados de resposta"
      });

      // Se o erro for especificamente sobre o certificado, o proxy pode retornar um 502 mais genérico.
      // A mensagem "self-signed certificate" geralmente está em error.message ou error.code (como `DEPTH_ZERO_SELF_SIGNED_CERT` ou `UNABLE_TO_VERIFY_LEAF_SIGNATURE`)
      const isCertError = /certificate|ssl|tls/i.test(axiosError.message) ||
                           (axiosError.code && /CERT|SSL|TLS/i.test(axiosError.code));

      if (isCertError) {
          logger.error("PROXY: Erro de certificado detectado ao conectar ao backend.");
          return NextResponse.json(
            { proxy_error: "Falha ao comunicar com o serviço de backend devido a um problema de certificado SSL.", backend_detail: `Erro: ${axiosError.code || axiosError.message}` },
            { status: 502 }
          );
      }

      const errorDetail = axiosError.response?.data ? String(axiosError.response.data) : axiosError.message;
      return NextResponse.json(
        { proxy_error: "Falha ao comunicar com o serviço de backend.", backend_detail: errorDetail },
        { status: axiosError.response?.status || 502 }
      );
    }
    return NextResponse.json( { proxy_error: "Erro interno no servidor proxy.", detail: error.message }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Método GET não permitido." }, { status: 405 });
}