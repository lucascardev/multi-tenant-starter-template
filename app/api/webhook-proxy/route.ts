// src/app/api/webhook-proxy/route.ts (VERSÃO DE TESTE SIMPLES)
import { NextRequest, NextResponse } from 'next/server';

const logger = console;

export async function POST(request: NextRequest) {
  logger.info("PROXY_TEST_SIMPLE: Webhook recebido no proxy Next.js (simples)");
  try {
    const bodyText = await request.text(); // Apenas lê o corpo para garantir que a requisição chegue
    logger.info("PROXY_TEST_SIMPLE: Corpo recebido (primeiros 200 chars):", bodyText.substring(0, 200));
    request.headers.forEach((value, key) => {
      logger.info(`PROXY_TEST_SIMPLE: Header: ${key} = ${value}`);
    });

    // Retorna um 200 OK imediatamente para o Svix
    return NextResponse.json({ message: "Webhook recebido pelo proxy (simples)" }, { status: 200 });

  } catch (error: any) {
    logger.error("PROXY_TEST_SIMPLE: Erro ao processar webhook (simples):", error.message);
    return NextResponse.json(
      { message: "Erro interno no servidor proxy de webhook (simples)", detail: error.message },
      { status: 500 }
    );
  }
}