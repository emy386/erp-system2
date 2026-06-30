import { Router, type IRouter } from "express";
import healthRouter from "./health";
import kidzyRouter from "./kidzy";

const router: IRouter = Router();

router.use(healthRouter);
router.use(kidzyRouter);

export default router;
