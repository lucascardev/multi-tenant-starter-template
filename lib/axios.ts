import axios, { InternalAxiosRequestConfig } from 'axios';
import { getCurrentStackUser } from './stackAuthClient'; // Importa a função
// Importe o tipo CurrentUser do SDK do Stack Auth para type hinting
import { type CurrentUser as StackCurrentUserType } from '@stackframe/stack';


const logger = {
    info: (...args: any[]) => console.log("AXIOS_INTERCEPTOR INFO:", ...args),
    warn: (...args: any[]) => console.warn("AXIOS_INTERCEPTOR WARN:", ...args),
    error: (...args: any[]) => console.error("AXIOS_INTERCEPTOR ERROR:", ...args),
};

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3030/api';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

apiClient.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
  let tokenToSend: string | null | undefined = null;

  if (typeof window !== "undefined") {
    try {
      const currentUser: StackCurrentUserType | null = await getCurrentStackUser();
      if (currentUser && typeof currentUser.getAuthJson === 'function' && !currentUser.isAnonymous) {
        const authJson = await currentUser.getAuthJson();
        if (authJson && authJson.accessToken) {
          tokenToSend = authJson.accessToken; // ESTE É O TOKEN JWT REAL
          logger.info("Token de acesso real do Stack Auth obtido.");
        } else { logger.warn("getAuthJson() não retornou um accessToken."); }
      } else if (currentUser?.isAnonymous) { logger.info("Usuário anônimo.");
      } else { logger.info("Nenhum usuário Stack Auth logado."); }
    } catch (e: any) { logger.warn("Falha ao obter token do Stack Auth:", e.message); }
  }


   // SIMULAÇÃO DE TOKEN PARA DESENVOLVIMENTO (se o token real não foi obtido)
   if (process.env.NODE_ENV === 'development' && !tokenToSend) {
    const simulatedAuthUserId = "auth_user_centrodonto_123_seed"; // ID que existe no seu DB semeado
    tokenToSend = `sim_dev_token_for_${simulatedAuthUserId}`; // O formato que seu backend simulado espera
    logger.warn(`Usando token SIMULADO: Bearer ${tokenToSend.substring(0,15)}...`);
  }
  // FIM DA SIMULAÇÃO

  // INJEÇÃO DE CONTEXTO DE TIME (x-stack-team-id)
  // Tenta extrair o Team ID da URL atual (ex: /dashboard/team-uuid-123)
  if (typeof window !== "undefined") {
      const dbMatch = window.location.pathname.match(/\/dashboard\/([^/]+)/);
      if (dbMatch && dbMatch[1]) {
          const teamId = dbMatch[1];
          config.headers['x-stack-team-id'] = teamId;
          // logger.info("Injetando x-stack-team-id:", teamId);
      }
  }

  if (tokenToSend) {
    // O token real (accessToken) geralmente NÃO inclui "Bearer ".
    // O token simulado pode ou não, dependendo de como seu backend o trata.
    // O middleware do backend espera "Bearer <token>", então adicionamos aqui.
    config.headers.Authorization = `Bearer ${tokenToSend}`;
  } else {
    logger.warn("Nenhum token para adicionar ao header Authorization.");
    // Remove o header se não houver token, para não enviar "Bearer undefined"
    delete config.headers.Authorization;
  }
  return config;
  
}, (error) => {
  logger.error("Erro no interceptor de request do Axios:", error);
  return Promise.reject(error);
});

export default apiClient;