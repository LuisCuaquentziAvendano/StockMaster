import { Router } from 'express';
import { ImagesController } from '../controllers';

const router = Router();

router.get('/getImage',
    ImagesController.getImage);

export default router;