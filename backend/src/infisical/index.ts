import axios from "axios";
import { AxiosError } from "axios";
import "dotenv/config";

enum Errors {
    NOT_AUTHENTICATE = "Could not authenticate",
    AUTHENTICATE_FAILED = "Infisical authentication failed",
    UNKOWN = "Unkown error",
    NOT_GET_SECRET = "Could not get secret"
}

function sleep(s: number) {
    const ms = s * 1000;
    return new Promise(resolve => setTimeout(resolve, ms));
}

class Infisical {
    private url: string;

    constructor() {
        if (process.env.REGION === "us") {
            this.url = "https://us.infisical.com"
        } else {
            this.url = "https://eu.infisical.com";
        }
    }
    private async _auth(retry?: number): Promise<string> {
        try {
            if (retry) {
                if (retry >= 5) {
                    throw new Error(Errors.AUTHENTICATE_FAILED);
                }
            }

            try {
                const response = await axios.post(`${this.url}/api/v1/auth/universal-auth/login`, {
                    clientId: process.env.CLIENT_ID,
                    clientSecret: process.env.CLIENT_SECRET
                });

                if (response.status !== 200) {
                    throw new Error(Errors.NOT_AUTHENTICATE);
                }

                if (!response.data['accessToken']) {
                    throw new Error(Errors.NOT_AUTHENTICATE);
                }
                return response.data['accessToken'];
            } catch (err) {
                if (err instanceof AxiosError) {
                    throw new Error(Errors.NOT_AUTHENTICATE);
                } else {
                    throw new Error(Errors.UNKOWN);
                }
            }
        } catch (err) {
            if (err instanceof Error) {
                if (err.message === Errors.NOT_AUTHENTICATE) {
                    await sleep(2 ** (retry ? retry + 1 : 1));
                    return this._auth(retry ? retry + 1 : 1);
                } else if (err.message === Errors.AUTHENTICATE_FAILED) {
                    console.log("Contact support! Infisical authenticate failed");
                    throw err;
                }
            }

            console.log("Could not authenticate", err);
            throw new Error(Errors.UNKOWN);
        }
    }

    async getSecret(secret: string, environmnet: string): Promise<string> {
        try {
            const token = await this._auth();
            let i = 0;

            while (i < 5) {
                try {
                    const response = await axios.get(`${this.url}/api/v3/secrets/raw/${secret}?workspaceId=${process.env.PROJECT_ID}&environment=${environmnet}`, {
                        headers: {
                            Authorization: `Bearer ${token}`
                        }
                    });

                    if (response.data?.secret?.secretValue) {
                        return response.data.secret.secretValue
                    } else {
                        await sleep(2 ** (i + 1));
                        i++;
                        continue;
                    }
                } catch (err) {
                    if (err instanceof AxiosError) {
                        const response = err.response;
                        if (response) {
                            if (response.data?.error) {
                                if (response.data.error === "UnauthorizedError") {
                                    await sleep(2 ** (i + 1))
                                    i = i + 1;
                                    continue;
                                }
                            }
                            throw new Error(Errors.UNKOWN);
                        }

                        throw new Error(Errors.UNKOWN);

                    } else {
                        throw new Error(Errors.UNKOWN);
                    }
                }
            }

            throw new Error(Errors.NOT_GET_SECRET);
        } catch (err) {
            if (err instanceof Error) {
                if (err.message === Errors.AUTHENTICATE_FAILED) {
                    console.log("authenticate failed contact support");
                    throw err;
                } else if (err.message === Errors.UNKOWN) {
                    console.log("something unexpected happend");
                    throw err;
                } else if (err.message === Errors.NOT_GET_SECRET) {
                    console.log("get secret failed contact support");
                    throw err;
                }
            }

            console.log("Error getting secret", err);
            throw new Error(Errors.UNKOWN);
        }
    }
}

const infisical = new Infisical();
export default infisical;