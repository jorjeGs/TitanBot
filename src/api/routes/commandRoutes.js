import { Router } from 'express';
import { getAllCommands } from '../controllers/commandController.js';

const router = Router();

router.get('/', getAllCommands);

export default router;
