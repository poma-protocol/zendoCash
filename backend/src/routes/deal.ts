import { Router } from "express";
import { MyError } from "../errors/type";
import { Errors } from "../errors/messages";
import { addressSchema, createDealSchema, joinSchema } from "../types";
import dealsController from "../controller/deals";
import smartContract from "../smartContract";
import dealModel from "../model/deals";

const router: Router = Router();

router.get("/id/:id", async(req, res) => {
    try {
        const dealID = Number.parseInt(req.params.id);
        const deal = await dealsController.get(dealID, dealModel);
        res.json(deal);
    } catch(err) {
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        }

        console.error("Error getting deal", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
});

router.get("/coin/:coin", async (req, res) => {
    try {
        const parsed = addressSchema.safeParse(req.params.coin);
        if (parsed.success) {
            const coinAddress = parsed.data;
            const deals = await dealsController.getMany({coinAddress}, dealModel, smartContract);
            res.json(deals);
        } else {
            const error = parsed.error.issues[0].message;
            res.status(400).json({message: error});
        }
    } catch(err) {
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        }

        console.error("Error getting deals for a specific coin", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
});

router.get("/all", async(req , res) => {
    try {
        const deals = await dealModel.getMany({});
        res.json(deals);
    } catch(err) {
        console.log("Error getting deals", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
});

router.post("/activate/:id", async(req, res) => {
    try {
        const id = Number.parseInt(req.params.id);
        await dealsController.markAsActivated(id, dealModel);
        res.status(201).json({message: "Deal marked as activated"})
    } catch(err) {
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        }

        console.error("Error updating deal to activated", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
})

router.post("/", async(req, res) => {
    try {
        const parsed = createDealSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
            const dealID = await dealsController.create(data, smartContract, dealModel);
            res.status(201).json({dealID: dealID});
        } else {
            const error = parsed.error.issues[0].message;
            res.status(400).json({message: error});
        }
    } catch(err) {
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        } else {
            console.log("Error creating deal", err);
            res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
        }
    }
});

router.post("/join", async (req , res) => {
    try {
        const parsed = joinSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
        } else {
            const error = parsed.error.issues[0].message;
            res.status(400).json({message: error});
        }
    } catch(err) {
        console.error("Error joining deal at endpoint", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
})

export default router;