declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number,
            DATABASE_URL: string,
            ARBITRUM_RPC_URL: string,
        }
    }
}

export {}