// src/app/api/webhook-proxy/route.ts
import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosRequestConfig, AxiosError } from 'axios';

const TARGET_BACKEND_WEBHOOK_URL = process.env.BACKEND_WEBHOOK_RECEIVER_URL || 'http://localhost:3030/api/webhook/stack';
// ^^^ Configure esta variável de ambiente no seu provedor de hospedagem do frontend (Vercel, Netlify)
// ou mantenha o localhost se o backend estiver acessível pela mesma máquina durante o desenvolvimento do proxy.
// Para produção, este seria o IP/domínio INTERNO do seu backend Express.

const logger = console; // Pode usar um logger mais robusto no frontend se desejar

export async function POST(request: NextRequest) {
  logger.info("PROXY: Webhook recebido no proxy Next.js");

  try {
    // 1. Capturar o corpo bruto da requisição original
    // NextRequest.text() ou .blob() ou .arrayBuffer() para pegar o corpo.
    // Para verificação de assinatura, o corpo bruto é essencial.
    const requestBodyBuffer = await request.arrayBuffer();
    const rawBody = Buffer.from(requestBodyBuffer); // Converte para Buffer do Node.js

    // 2. Capturar os headers relevantes da requisição original
    // Especialmente os headers do Svix e Content-Type
    const originalHeaders: Record<string, string> = {};
    request.headers.forEach((value, key) => {
      originalHeaders[key.toLowerCase()] = value; // Normaliza para minúsculas
    });

    logger.info("PROXY: Headers recebidos do Stack Auth:", JSON.stringify(originalHeaders, null, 2).substring(0, 500) + "...");
    // logger.info("PROXY: Corpo bruto recebido (primeiros 200 bytes):", rawBody.toString('utf8', 0, 200));

    // 3. Preparar a requisição para o backend Express
    const headersForBackend: Record<string, string> = {
      'content-type': originalHeaders['content-type'] || 'application/json', // Repassa o content-type
    };
    if (originalHeaders['svix-id']) headersForBackend['svix-id'] = originalHeaders['svix-id'];
    if (originalHeaders['svix-timestamp']) headersForBackend['svix-timestamp'] = originalHeaders['svix-timestamp'];
    if (originalHeaders['svix-signature']) headersForBackend['svix-signature'] = originalHeaders['svix-signature'];
    // Adicione outros headers que seu backend possa esperar ou que sejam importantes

    // logger.info("PROXY: Headers sendo enviados para o backend Express:", JSON.stringify(headersForBackend, null, 2));

    // 4. Fazer a requisição para o backend Express.js
    // O Axios espera que 'data' seja uma string, buffer, ou stream se Content-Type for application/json
    // Se o backend Express espera o corpo bruto e o middleware express.json({verify}) vai lê-lo,
    // então enviar o Buffer diretamente é o ideal.
    const axiosConfig: AxiosRequestConfig = {
      method: 'POST',
      url: TARGET_BACKEND_WEBHOOK_URL,
      headers: headersForBackend,
      data: rawBody, // Envia o Buffer bruto
      responseType: 'arraybuffer', // Para pegar a resposta do backend como buffer também
    };

    logger.info(`PROXY: Encaminhando para backend: ${TARGET_BACKEND_WEBHOOK_URL}`);
    const backendResponse = await axios(axiosConfig);
    logger.info(`PROXY: Resposta do backend Express - Status: ${backendResponse.status}`);

    // 5. Retornar a resposta do backend Express para o Stack Auth
    // Convertendo o buffer da resposta do backend para string se for texto/json
    let responseData: any = backendResponse.data;
    const backendContentType = backendResponse.headers['content-type'];
    if (backendContentType && backendContentType.includes('json') && Buffer.isBuffer(responseData)) {
        responseData = Buffer.from(responseData).toString('utf8');
        try { responseData = JSON.parse(responseData); } catch (e) { /* Mantém como string se não for JSON válido */ }
    } else if (Buffer.isBuffer(responseData)) {
        responseData = Buffer.from(responseData).toString('utf8');
    }


    // Cria uma nova resposta Next.js com o status e corpo do backend
    const nextJsResponse = new NextResponse(
        (typeof responseData === 'object' && responseData !== null) ? JSON.stringify(responseData) : responseData,
        {
            status: backendResponse.status,
            headers: {
                'Content-Type': backendContentType || 'application/json', // Repassa content-type do backend
                // Repassar outros headers importantes do backend, se houver
            },
        }
    );
    return nextJsResponse;

  } catch (error: any) {
    logger.error("PROXY: Erro ao processar/encaminhar webhook:", error.message);
    if (axios.isAxiosError(error)) {
      const axiosError = error as AxiosError;
      logger.error("PROXY: Detalhes do erro Axios:", {
        url: axiosError.config?.url,
        method: axiosError.config?.method,
        status: axiosError.response?.status,
        data: axiosError.response?.data ? Buffer.from(axiosError.response.data as any).toString('utf8').substring(0, 500) : "Sem dados de resposta",
      });
      // Retorna o status e a mensagem de erro do backend, se disponível
      return NextResponse.json(
        { message: "Erro ao encaminhar para o serviço de backend", detail: axiosError.response?.data ? Buffer.from(axiosError.response.data as any).toString('utf8') : axiosError.message },
        { status: axiosError.response?.status || 502 } // Bad Gateway se o backend falhar
      );
    }
    return NextResponse.json(
      { message: "Erro interno no servidor proxy de webhook", detail: error.message },
      { status: 500 }
    );
  }
}

// Para outros métodos HTTP, você pode retornar um erro 405 Method Not Allowed
export async function GET(request: NextRequest) {
  return NextResponse.json({ message: "Método GET não permitido para este endpoint." }, { status: 405 });
}
// Adicione para PUT, DELETE, etc., se necessário