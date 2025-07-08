import "dotenv/config";
import { PostHog } from "posthog-node";

export enum PostHogEventTypes {
    WARNING="warning",
    ERROR="error"
}

class Logger {
    private client: PostHog

    constructor() {
        if (!process.env.POSTHOG_SECRET || !process.env.POSTHOG_URL || !process.env.POSTHOG_DISTINCT_ID) {
            console.log("Set POSTHOG_SECRET and POSTHOG_SECRET in env variables");
            throw new Error("Set POSTHOG_SECRET and POSTHOG_SECRET in env variables");
        }

        this.client = new PostHog(
            process.env.POSTHOG_SECRET,
            { host: process.env.POSTHOG_URL }
        )
    }

    async sendEvent(event_type: PostHogEventTypes, description: string, details: any) {
        if (!(process.env.POSTHOG_DISTINCT_ID === "zendocash local development")) {
            try {
                this.client.capture({
                    distinctId: process.env.POSTHOG_DISTINCT_ID,
                    event: event_type,
                    properties: {
                        app: "zendocash",
                        description,
                        details: details.toString()
                    }
                });
    
                await this.client.shutdown();
            } catch(err) {
                console.log("Could not send event", err);
                throw new Error("Could not send posthog event");
            }
        }
    }
}

const logger = new Logger();
export default logger;