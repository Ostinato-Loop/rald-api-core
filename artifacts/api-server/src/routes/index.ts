import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import ecosystemRouter from "./ecosystem";
import reposRouter from "./repos";
import deploymentsRouter from "./deployments";
import paymentsRouter from "./payments";
import logisticsRouter from "./logistics";
import secretsRouter from "./secrets";
import expansionRouter from "./expansion";
import agentsRouter from "./agents";
import referralsRouter from "./referrals";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use("/ecosystem", ecosystemRouter);
router.use("/repos", reposRouter);
router.use("/deployments", deploymentsRouter);
router.use("/payments", paymentsRouter);
router.use("/logistics", logisticsRouter);
router.use("/secrets", secretsRouter);
router.use("/expansion", expansionRouter);
router.use("/agents", agentsRouter);
router.use("/referrals", referralsRouter);

export default router;
