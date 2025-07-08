import {Router} from "express";
import { Errors } from "../errors/messages";
import smartContract from "../smartContract";
import { MyError } from "../errors/type";
import logger, { PostHogEventTypes } from "../logging";

const router: Router = Router();

router.get("/details/:adderss", async (req , res) => {
    try {
        const address = req.params.adderss;
        const tokenDetails = await smartContract.getTokenDetails(address);
        res.json(tokenDetails);
    } catch(err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting details of token", err.message);
            res.status(400).json({message: err.message});
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request Level: Error getting details of token", err);
        console.error("Error getting details of token at address", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
})

export default router;