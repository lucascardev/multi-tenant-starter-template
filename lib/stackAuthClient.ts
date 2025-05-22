import { StackClientApp, User as StackUserType, CurrentUser as StackCurrentUserType } from '@stackframe/stack'; // Ajuste os imports conforme o SDK real

let stackClient: StackClientApp | null = null;
const logger = { info: console.log, warn: console.warn, error: console.error };


export function initializeStackClient(): StackClientApp {
  if (!stackClient) {
    if (typeof window === 'undefined') {
      throw new Error("StackClientApp não pode ser inicializado no lado do servidor desta forma.");
    }
    // VERIFIQUE A DOCUMENTAÇÃO DO STACK PARA A INICIALIZAÇÃO CORRETA
    stackClient = new StackClientApp({
      tokenStore: "nextjs-cookie", // Ou "cookie"
      urls: {
        home: '/',
        signIn: '/auth/sign-in', // Configure suas URLs
        signUp: '/auth/sign-up',
      },
      // publishableClientKey: process.env.NEXT_PUBLIC_STACK_PUBLISHABLE_KEY, // Se necessário
    });
    logger.info("StackClientApp inicializado.");
  }
  return stackClient;
}

// Função para obter o usuário atual de forma assíncrona fora de hooks
// Garante que o tipo de retorno seja StackCurrentUserType | null
export async function getCurrentStackUser(): Promise<StackCurrentUserType | null> {
  if (typeof window === 'undefined') return null;
  const client = initializeStackClient();
  try {
    // getUser() com or: "return-null" retorna CurrentUser | null
    const user = await client.getUser({ or: "return-null" });
    // O 'user' retornado por client.getUser já deve ser do tipo CurrentUser se não for null
    return user as StackCurrentUserType | null; // Cast explícito se necessário, mas getUser deve retornar o tipo certo
  } catch (error) {
    logger.error("Erro ao tentar obter getCurrentStackUser:", error);
    return null;
  }
}

// Tenta inicializar no carregamento do script
if (typeof window !== 'undefined') {
    try { initializeStackClient(); } catch (e) { /* ... */ }
}