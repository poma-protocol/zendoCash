import z from "zod";

export const createDealSchema = z.object({
    contract_address: z.string({message: "Contract address must be a string"}).regex(/^(0x)?[0-9a-fA-F]{40}$/, {message: "Contract address must be a valid ethereum address"}),
    name: z.string({message: "Name of deal must be a string"}),
    minimum_amount_hold: z.number({message: "Minimum amount to hold must be a number"}).gt(0, {message: "Minimum amount to hold must be greater than zero"}),
    minimum_days_hold: z.number({message: "Minimum days to hold must be a number"}).gt(0, {message: "Minimum days to hold must be greater than zero"}).int({message: "Minimum days to hold must be a whole number"}),
    reward: z.number({message: "Reward must be a number"}).gt(0, {message: "Reward must be greater than zero"}),
    max_rewards_give_out: z.number({message: "Max rewards to give out must be a number"}).gt(0, {message: "Max rewards to give out must be greater than zero"}).int({message: "Max rewards to give out must be a whole number"}),
    coin_owner_address: z.string({message: "Coin owner address must be a string"}).regex(/^(0x)?[0-9a-fA-F]{40}$/, {message: "Coin owner address must be a valid ethereum address"}),
    start_date: z.string({message: "Start date must be a date"}),
    end_date: z.string({message: "End date must be a date"}),
    description: z.string({message: "Description should be a string"}).optional(),
    code: z.string().nullable().optional()
});

export const addressSchema = z.string({message: "Address must be a string"}).regex(/^(0x)?[0-9a-fA-F]{40}$/, {message: "Must be a valid ethereum address"});

export type CreateDealsType = z.infer<typeof createDealSchema>;

export const joinSchema = z.object({
    address: z.string({message: "Address must be a string"}).regex(/^(0x)?[0-9a-fA-F]{40}$/, {message: "Must be a valid ethereum address"}),
    deal_id: z.number({message: "Invalid deal"}),
});

export const activateSchema = z.object({
    dealID: z.number({message: "Invalid deal"}),
    transaction_hash: z.string({message: "Transaction hash must be a string"}).regex(/^(0x)?[0-9a-fA-F]{64}$/, {message: "Must be a valid ethereum transaction hash"}),
    code: z.string().nullable().optional()
});

export const commissionSchema = z.object({
    dealID: z.number({message: "Invalid deal"}),
    transaction_hash: z.string({message: "Transaction hash must be a string"}).regex(/^(0x)?[0-9a-fA-F]{64}$/, {message: "Must be a valid ethereum transaction hash"}),
});

export type JoinSchemaType = z.infer<typeof joinSchema>;

export const decodedTransactionSchema = z.object({
    jsonrpc: z.string().optional(),
    id: z.string().optional(),
    result: z.object({
        from: z.string(),
        input: z.string(),
        to: z.string()
    })
});

const tokenPrice = z.object({
    prices: z.array(z.object({
        currency: z.string(),
        value: z.string().transform((arg) => Number.parseFloat(arg))
    }))
})

export const tokenPriceSchema = z.object({
    data: z.array(tokenPrice)
});

export type TokenPrice = z.infer<typeof tokenPriceSchema>;