declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number,
            DATABASE_URL: string,
            RPC_URL: string,
            ALCHEMY_KEY: string,
            CONTRACT_ADDRESS: string
        }
    }
}

export {}