declare global {
    namespace NodeJS {
        interface ProcessEnv {
            PORT: number,
            DATABASE_URL: string,
            RPC_URL: string,
            CONTRACT_ADDRESS: string,
            COMMISSION_ACCOUNT: string,
            PROJECT_ID: string,
            CLIENT_ID: string,
            CLIENT_SECRET: string,
            REGION: string,
        }
    }
}

export {}