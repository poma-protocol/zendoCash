import { Router } from "express";
import { MyError } from "../errors/type";
import { Errors } from "../errors/messages";
import { createDealSchema } from "../types";
import dealsController from "../controller/deals";
import smartContract from "../smartContract";
import dealModel from "../model/deals";

const router: Router = Router();

router.post("/", async(req, res) => {
    try {
        const parsed = createDealSchema.safeParse(req.body);
        if (parsed.success) {
            const data = parsed.data;
            const dealID = await dealsController.create(data, smartContract, dealModel);
            res.json({dealID: dealID});
        } else {
            const error = parsed.error.issues[0].message;
            res.status(400).json({message: error});
        }
    } catch(err) {
        if (err instanceof MyError) {
            res.status(400).json({message: err.message})
        } else {
            console.log("Error creating deal", err);
            res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
        }
    }
})

export default router;