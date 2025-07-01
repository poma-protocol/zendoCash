import {Router} from "express";
import { Errors } from "../errors/messages";
import smartContract from "../smartContract";
import { MyError } from "../errors/type";

const router: Router = Router();

router.get("/details/:adderss", async (req , res) => {
    try {
        const address = req.params.adderss;
        const tokenDetails = await smartContract.getTokenDetails(address);
        res.json(tokenDetails);
    } catch(err) {
        if (err instanceof MyError) {
            res.status(400).json({message: err.message});
            return;
        }

        console.error("Error getting details of token at address", err);
        res.status(500).json({message: Errors.INTERNAL_SERVER_ERROR});
    }
})

export default router;