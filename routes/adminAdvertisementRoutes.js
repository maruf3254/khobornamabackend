
const express = require('express');
const router = express.Router();

const {
  protect,
  admin
} = require('../middleware/auth');

const {
  getAllAdvertisements,
  getAdminAdvertisementById,
  updateAdvertisementStatus,
  adminDeleteAdvertisement,
  getAdvertisementOverview
} = require('../controllers/advertisementController');

// All routes require admin authentication
router.use(protect, admin);

// Dashboard statistics
router.get('/overview', getAdvertisementOverview);

// Get all advertisements
router.get('/', getAllAdvertisements);

// Get individual advertisement
router.get('/:id', getAdminAdvertisementById);

// Approve, reject, pause or resume
router.patch('/:id/status', updateAdvertisementStatus);

// Delete advertisement
router.delete('/:id', adminDeleteAdvertisement);

module.exports = router;
