import Express from "express";
import "dotenv/config";
import { MyError } from "./errors/type";
import { Errors } from "./errors/messages";
import cors from "cors";

import dealsRouter from "./routes/deal";

const app = Express();
app.use("/", cors());
app.use("/", Express.json());
app.use("/deals", dealsRouter);

const PORT = process.env.PORT;
if (!PORT) {
    console.error("Set PORT in env variables");
    throw new MyError("Set PORT in env variables");
}

app.all('*any', (_, res) => {
    res.status(404).json({message: Errors.ROUTE_NOT_FOUND});
});

app.listen(PORT, (err) => {
    if(err) {
        console.error("Error", err);
    }

    console.log(`Server listening on port ${PORT}...`);
});