
const express = require('express');
const router = express.Router();

const {
  protect,
  advertiser
} = require('../middleware/auth');

const upload = require('../middleware/upload');

const {
  createAdvertisement,
  getMyAdvertisements,
  getMyAdvertisementById,
  updateMyAdvertisement,
  deleteMyAdvertisement,
  getMyAdvertisementStats,
  getPublicAdvertisements,
  recordImpression,
  recordClick
} = require('../controllers/advertisementController');

// Public routes
router.get('/public', getPublicAdvertisements);
router.post('/:id/impression', recordImpression);
router.post('/:id/click', recordClick);

// Advertiser protected routes
router.use(protect, advertiser);

router.get('/my', getMyAdvertisements);
router.get('/my/stats', getMyAdvertisementStats);
router.get('/my/:id', getMyAdvertisementById);

router.post(
  '/',
  upload.single('image'),
  createAdvertisement
);

router.put(
  '/:id',
  upload.single('image'),
  updateMyAdvertisement
);

router.delete('/:id', deleteMyAdvertisement);

module.exports = router;
