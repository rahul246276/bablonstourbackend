const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const { authorize } = require('../middleware/roleMiddleware');
const validate = require('../middleware/validateMiddleware');
const schemas = require('../validators/itineraryTemplateValidator');
const controller = require('../controllers/itineraryTemplateController');

router.use(protect, authorize('super_admin', 'admin'));
router.get('/', validate(schemas.listItineraryTemplatesSchema), controller.listItineraryTemplates);
router.post('/', validate(schemas.createItineraryTemplateSchema), controller.createItineraryTemplate);
router.get('/:id', validate(schemas.itineraryTemplateIdSchema), controller.getItineraryTemplate);
router.patch('/:id/archive', validate(schemas.itineraryTemplateIdSchema), controller.archiveItineraryTemplate);
router.post('/:id/duplicate', validate(schemas.itineraryTemplateIdSchema), controller.duplicateItineraryTemplate);
router.patch('/:id', validate(schemas.updateItineraryTemplateSchema), controller.updateItineraryTemplate);
module.exports = router;
