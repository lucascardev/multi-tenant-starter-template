// src/app/api/webhook-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosRequestConfig, AxiosError, isAxiosError } from 'axios'; // Importado isAxiosError

const TARGET_BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_RECEIVER_URL;
// Exemplo: 'http://<ip_interno_ou_servico_k8s_backend>:3030/api/webhook/stack'

// Logger simples, substitua por um logger mais robusto se necessário em produção
const logger = {
    info: (...args: any[]) => console.log("[PROXY INFO]", ...args),
    warn: (...args: any[]) => console.warn("[PROXY WARN]", ...args),
    error: (...args: any[]) => console.error("[PROXY ERROR]", ...args),
    debug: (...args: any[]) => console.log("[PROXY DEBUG]", ...args), // Adicionado debug
};

if (!TARGET_BACKEND_WEBHOOK_URL && process.env.NODE_ENV !== 'test') {
    logger.error("Variável de ambiente BACKEND_WEBHOOK_RECEIVER_URL não está definida!");
    // Em um cenário real, você pode querer que a função falhe ao iniciar se esta URL for crítica.
}

export async function POST(request: NextRequest) {
  logger.info(`Webhook recebido em ${request.url}`);

  if (!TARGET_BACKEND_WEBHOOK_URL) {
    logger.error("URL do backend de destino não configurada.");
    return NextResponse.json({ message: "Erro de configuração interna do proxy." }, { status: 503 }); // Service Unavailable
  }

  let rawBody: Buffer;
  try {
    const requestBodyArrayBuffer = await request.arrayBuffer();
    rawBody = Buffer.from(requestBodyArrayBuffer);
    logger.info(`Corpo da requisição recebido (tamanho: ${rawBody.length} bytes). Primeiros 100 bytes: ${rawBody.toString('utf8', 0, 100)}...`);
  } catch (err: any) {
    logger.error("Erro ao ler o corpo da requisição original:", err.message);
    return NextResponse.json({ message: "Falha ao ler o corpo da requisição." }, { status: 400 });
  }

  const originalHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    originalHeaders[key.toLowerCase()] = value;
  });
  logger.debug("Headers originais recebidos pelo proxy:", JSON.stringify(originalHeaders).substring(0, 500) + "...");


  // Monta os headers para encaminhar ao backend
  // É crucial repassar os headers Svix e Content-Type
  const headersForBackend: Record<string, string> = {
    'content-type': originalHeaders['content-type'] || 'application/json', // Essencial
  };
  if (originalHeaders['svix-id']) headersForBackend['svix-id'] = originalHeaders['svix-id'];
  if (originalHeaders['svix-timestamp']) headersForBackend['svix-timestamp'] = originalHeaders['svix-timestamp'];
  if (originalHeaders['svix-signature']) headersForBackend['svix-signature'] = originalHeaders['svix-signature'];
  // Adicione outros headers que seu backend possa necessitar, como 'x-forwarded-for', etc.
  // logger.debug("Headers sendo encaminhados para o backend Express:", JSON.stringify(headersForBackend));

  try {
    logger.info(`Encaminhando webhook para: ${TARGET_BACKEND_WEBHOOK_URL}`);
    const axiosConfig: AxiosRequestConfig = {
      method: 'POST',
      url: TARGET_BACKEND_WEBHOOK_URL,
      headers: headersForBackend,
      data: rawBody, // Envia o Buffer bruto
      timeout: 25000, // Timeout para a chamada ao backend (ex: 25 segundos) - Svix geralmente tem timeout de 30s
      // responseType: 'arraybuffer', // Para ter mais controle sobre a resposta do backend
                                   // mas se o backend sempre retorna JSON, 'json' pode ser usado.
                                   // 'text' pode ser mais seguro para evitar erros de parse de JSON no Axios.
      responseType: 'text', // Recebe como texto para inspecionar antes de retornar
    };

    const backendResponse = await axios(axiosConfig);

    logger.info(`Resposta do backend Express - Status: ${backendResponse.status}`);
    // logger.debug("Headers da resposta do backend:", JSON.stringify(backendResponse.headers));
    // logger.debug("Corpo da resposta do backend (texto):", backendResponse.data ? (backendResponse.data as string).substring(0, 200) + "..." : "Corpo vazio");


    // Prepara os headers da resposta para o Svix
    const responseHeaders = new Headers();
    // Repassa o Content-Type da resposta do backend, ou default para JSON
    responseHeaders.set('Content-Type', backendResponse.headers['content-type'] || 'application/json');
    // Adicione outros headers da resposta do backend que sejam relevantes para o Svix, se houver.

    // Svix geralmente espera um 2xx para sucesso.
    // Se o backend respondeu com 2xx, repassamos.
    // Se o backend respondeu com erro (4xx, 5xx), o Svix verá isso como falha.
    return new NextResponse(backendResponse.data, {
        status: backendResponse.status,
        headers: responseHeaders,
    });

  } catch (error: any) {
    logger.error("Erro ao encaminhar webhook para o backend Express:", error.message);

    if (isAxiosError(error)) { // Erro específico do Axios
      const axiosError = error as AxiosError<any>; // Tipar 'any' para data por segurança
      logger.error("Detalhes do erro Axios:", {
        message: axiosError.message,
        code: axiosError.code, // Ex: ECONNREFUSED, ETIMEDOUT
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        status: axiosError.response?.status, // Status HTTP da resposta do backend (se houve)
        responseData: axiosError.response?.data ? (typeof axiosError.response.data === 'string' ? axiosError.response.data.substring(0, 500) : JSON.stringify(axiosError.response.data).substring(0,500)) : "Sem dados de resposta do backend"
      });

      // Retorna um status de erro para o Svix que indica falha do gateway/proxy
      // O corpo pode conter a mensagem de erro do backend se disponível
      const errorDetail = axiosError.response?.data ?
        (typeof axiosError.response.data === 'string' ? axiosError.response.data : JSON.stringify(axiosError.response.data))
        : axiosError.message;

      return NextResponse.json(
        { proxy_error: "Falha ao comunicar com o serviço de backend.", backend_detail: errorDetail },
        { status: axiosError.response?.status || 502 } // 502 Bad Gateway é apropriado
      );
    } else { // Outros erros (ex: ao ler o corpo da requisição original)
      logger.error("Erro não-Axios no proxy:", error);
      return NextResponse.json(
        { proxy_error: "Erro interno no servidor proxy de webhook.", detail: error.message },
        { status: 500 }
      );
    }
  }
}

// Handler para outros métodos HTTP
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Método GET não permitido." }, { status: 405 });
}
// Adicione PUT, DELETE etc. se quiser tratá-los explicitamente