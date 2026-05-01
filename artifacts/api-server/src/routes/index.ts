import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import gamesRouter from "./games";
import profileRouter from "./profile";
import socialRouter from "./social";
import questsRouter from "./quests";
import lotteryRouter from "./lottery";
import adminRouter from "./admin";
import chatRouter from "./chat";
import tournamentsRouter from "./tournaments";

const router: IRouter = Router();

router.use(healthRouter);
router.use(authRouter);
router.use(gamesRouter);
router.use(profileRouter);
router.use(socialRouter);
router.use(questsRouter);
router.use(lotteryRouter);
router.use(adminRouter);
router.use(chatRouter);
router.use(tournamentsRouter);

export default router;
