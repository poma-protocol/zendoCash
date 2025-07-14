import { Router } from "express";
import { MyError } from "../errors/type";
import { Errors } from "../errors/messages";
import { activateSchema, addressSchema, commissionSchema, createDealSchema, joinSchema } from "../types";
import dealsController from "../controller/deals";
import smartContract from "../smartContract";
import dealModel, { DealsModel } from "../model/deals";
import logger, { PostHogEventTypes } from "../logging";

const router: Router = Router();

router.get("/id/:id", async (req, res) => {
    try {
        const dealID = Number.parseInt(req.params.id);
        const deal = await dealsController.get(dealID, dealModel, smartContract);
        res.json(deal);
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting deal from ID", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error getting deal from ID", err);
        console.error("Error getting deal", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

router.get("/coin/:coin", async (req, res) => {
    try {
        const parsed = addressSchema.safeParse(req.params.coin);
        if (parsed.success) {
            const coinAddress = parsed.data;
            const deals = await dealsController.getMany({ coinAddress }, dealModel, smartContract);
            res.json(deals);
        } else {
            const error = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for getting deals for coin", error);
            res.status(400).json({ message: error });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting deals for coin", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error getting deals for coin", err);
        console.error("Error getting deals for a specific coin", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

router.get("/all", async (req, res) => {
    try {
        const deals = await dealsController.getExplorePageDetails(dealModel, smartContract);
        res.json(deals);
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting all deals", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error getting all deals", err);
        console.log("Error getting deals", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

router.get("/player/:address", async (req, res) => {
    try {
        const parsed = addressSchema.safeParse(req.params.address);
        if (parsed.success) {
            const address = parsed.data;
            const deals = await dealsController.getMany({ playerAddress: address }, dealModel, smartContract);
            res.json(deals);
        } else {
            const error = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for getting deals that player has joined", error);
            res.status(400).json({ message: error });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting deals that player has joined", err);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error getting deals that player has joined", err);
        console.error("Error getting deals that a player has joined in", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

router.get("/owner/:address", async (req, res) => {
    try {
        const parsed = addressSchema.safeParse(req.params.address);
        if (parsed.success) {
            const address = parsed.data;
            const deals = await dealsController.getMany({ owner: address }, dealModel, smartContract);
            res.json(deals);
        } else {
            const error = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for getting deals created by user", error);
            res.status(400).json({ message: error });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting deals created by user", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error getting deals created by user", err);
        console.error("Error getting deals that user has created", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
})

router.get("/featured", async (req, res) => {
    try {
        const allDeals = await dealsController.getExplorePageDetails(dealModel, smartContract);
        const numActiveDeals = allDeals.length;
        const copied = [...allDeals];
        const featured = copied.sort((a, b) => (b.reward * b.tokenPrice * b.maxRewards) - (a.reward * a.tokenPrice * a.maxRewards))
        res.json({featured: featured.slice(0, 3), active: numActiveDeals});
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error getting featured deals", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error getting featured deals", err);
        console.error("Error getting deals that a player has joined in", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
})

router.post("/activate", async (req, res) => {
    try {
        const parsed = activateSchema.safeParse(req.body);
        if (parsed.success) {
            const details = parsed.data;
            await dealsController.markAsActivated(details.dealID, details.transaction_hash, details.code, dealModel, smartContract);
            res.status(201).json({ message: "Deal marked as activated" })
        } else {
            const errors = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for activating deal", errors);
            res.status(400).json({ message: errors });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error activating deal", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error activating deal", err);
        console.error("Error updating deal to activated", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
});

router.post("/commission", async (req, res) => {
    try {
        const parsed = commissionSchema.safeParse(req.body);
        if (parsed.success) {
            const details = parsed.data;
            await dealsController.storeCommission(details.dealID, details.transaction_hash, dealModel, smartContract);
            res.status(201).json({ message: "Deal commission paid" })
        } else {
            const errors = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for paying deal commission", errors);
            res.status(400).json({ message: errors });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error paying commission for deal", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error paying commission for deal", err);
        console.error("Error updating deal to commission paid", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
})

router.post("/", async (req, res) => {
    try {
        const parsed = createDealSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
            const dealID = await dealsController.create(data, smartContract, dealModel);
            res.status(201).json({ dealID: dealID });
        } else {
            const error = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for creating deal", error);
            res.status(400).json({ message: error });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error creating deal", err.message);
            res.status(400).json({ message: err.message });
            return;
        } else {
            await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error creating deal", err);
            console.log("Error creating deal", err);
            res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
        }
    }
});

router.post("/join", async (req, res) => {
    try {
        const parsed = joinSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
            const hasBalance = await dealsController.join(data, smartContract, dealModel);
            res.status(201).json({ hasBalance });
        } else {
            const error = parsed.error.issues[0].message;
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Invalid data for joining deal", error);
            res.status(400).json({ message: error });
        }
    } catch (err) {
        if (err instanceof MyError) {
            await logger.sendEvent(PostHogEventTypes.WARNING, "Request: Error joining deal", err.message);
            res.status(400).json({ message: err.message });
            return;
        }

        await logger.sendEvent(PostHogEventTypes.ERROR, "Request: Error joining deal", err);
        console.error("Error joining deal at endpoint", err);
        res.status(500).json({ message: Errors.INTERNAL_SERVER_ERROR });
    }
})

export default router;