
const Advertisement = require('../models/Advertisement');
const mongoose = require('mongoose');

const placements = [
  'header',
  'sidebar',
  'in-article',
  'homepage-section',
  'mobile'
];

const statuses = [
  'pending',
  'approved',
  'rejected',
  'paused'
];

// Validate destination URL
const isValidUrl = (value) => {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

// Validate campaign dates
const validateDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  return (
    !Number.isNaN(start.getTime()) &&
    !Number.isNaN(end.getTime()) &&
    start < end
  );
};

// Create advertisement
exports.createAdvertisement = async (req, res) => {
  try {
    const {
      title,
      description,
      targetUrl,
      placement,
      device,
      startDate,
      endDate
    } = req.body;

    if (
      !title ||
      !targetUrl ||
      !placement ||
      !startDate ||
      !endDate
    ) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields'
      });
    }

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'Advertisement image is required'
      });
    }

    if (!placements.includes(placement)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement placement'
      });
    }

    if (!isValidUrl(targetUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid HTTP or HTTPS URL'
      });
    }

    if (
      device &&
      !['all', 'desktop', 'mobile'].includes(device)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device type'
      });
    }

    if (!validateDates(startDate, endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement campaign dates'
      });
    }

    const advertisement = await Advertisement.create({
      advertiser: req.user._id,
      title,
      description,
      targetUrl,
      placement,
      device: device || 'all',
      startDate,
      endDate,
      image: `/uploads/${req.file.filename}`,
      status: 'pending'
    });

    res.status(201).json({
      success: true,
      message: 'Advertisement submitted for approval',
      data: advertisement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get advertiser's own advertisements
exports.getMyAdvertisements = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      50,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const skip = (page - 1) * limit;

    const filter = {
      advertiser: req.user._id
    };

    if (
      req.query.status &&
      statuses.includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    const [advertisements, total] = await Promise.all([
      Advertisement.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Advertisement.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: advertisements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Get advertiser's single advertisement
exports.getMyAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Update advertiser's advertisement
exports.updateMyAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findOne({
      _id: req.params.id,
      advertiser: req.user._id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    if (!['pending', 'rejected'].includes(advertisement.status)) {
      return res.status(400).json({
        success: false,
        message: 'Only pending or rejected advertisements can be edited'
      });
    }

    const allowedFields = [
      'title',
      'description',
      'targetUrl',
      'placement',
      'device',
      'startDate',
      'endDate'
    ];

    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.targetUrl && !isValidUrl(updates.targetUrl)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid target URL'
      });
    }

    if (
      updates.placement &&
      !placements.includes(updates.placement)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid placement'
      });
    }

    if (
      updates.device &&
      !['all', 'desktop', 'mobile'].includes(updates.device)
    ) {
      return res.status(400).json({
        success: false,
        message: 'Invalid device'
      });
    }

    const startDate = updates.startDate || advertisement.startDate;
    const endDate = updates.endDate || advertisement.endDate;

    if (!validateDates(startDate, endDate)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid campaign dates'
      });
    }

    if (req.file) {
      updates.image = `/uploads/${req.file.filename}`;
    }

    // Edited rejected advertisements require new approval
    if (advertisement.status === 'rejected') {
      updates.status = 'pending';
      updates.rejectionReason = '';
    }

    Object.assign(advertisement, updates);

    await advertisement.save();

    res.status(200).json({
      success: true,
      message: 'Advertisement updated successfully',
      data: advertisement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Delete own advertisement
exports.deleteMyAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findOneAndDelete({
      _id: req.params.id,
      advertiser: req.user._id
    });

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Get all advertisements
exports.getAllAdvertisements = async (req, res) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1);
    const limit = Math.min(
      100,
      Math.max(1, Number(req.query.limit) || 10)
    );

    const skip = (page - 1) * limit;

    const filter = {};

    if (req.query.status === 'expired') {
      filter.endDate = { $lt: new Date() };
      filter.status = { $ne: 'rejected' };
    } else if (
      req.query.status &&
      statuses.includes(req.query.status)
    ) {
      filter.status = req.query.status;
    }

    if (
      req.query.placement &&
      placements.includes(req.query.placement)
    ) {
      filter.placement = req.query.placement;
    }

    if (req.query.search) {
      const search = req.query.search.trim();

      filter.title = {
        $regex: search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        $options: 'i'
      };
    }

    const [advertisements, total] = await Promise.all([
      Advertisement.find(filter)
        .populate('advertiser', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),

      Advertisement.countDocuments(filter)
    ]);

    res.status(200).json({
      success: true,
      data: advertisements,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Get advertisement details
exports.getAdminAdvertisementById = async (req, res) => {
  try {
    const advertisement = await Advertisement.findById(
      req.params.id
    ).populate('advertiser', 'name email');

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.status(200).json({
      success: true,
      data: advertisement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Approve, reject, pause or resume
exports.updateAdvertisementStatus = async (req, res) => {
  try {
    const { status, rejectionReason } = req.body;

    if (!statuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement status'
      });
    }

    const advertisement = await Advertisement.findById(
      req.params.id
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    if (status === 'rejected' && !rejectionReason?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    if (status === 'approved') {
      if (new Date(advertisement.endDate) <= new Date()) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve an expired campaign'
        });
      }

      advertisement.approvedAt = new Date();
      advertisement.rejectionReason = '';
    }

    if (status === 'rejected') {
      advertisement.rejectionReason = rejectionReason.trim();
    }

    if (status !== 'rejected' && status !== 'paused') {
      advertisement.rejectionReason = '';
    }

    advertisement.status = status;

    await advertisement.save();

    res.status(200).json({
      success: true,
      message: `Advertisement ${status} successfully`,
      data: advertisement
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Delete any advertisement
exports.adminDeleteAdvertisement = async (req, res) => {
  try {
    const advertisement = await Advertisement.findByIdAndDelete(
      req.params.id
    );

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Advertisement deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Public: Get active advertisements
exports.getPublicAdvertisements = async (req, res) => {
  try {
    const now = new Date();

    const filter = {
      status: 'approved',
      startDate: { $lte: now },
      endDate: { $gt: now }
    };

    if (req.query.placement) {
      if (!placements.includes(req.query.placement)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid placement'
        });
      }

      filter.placement = req.query.placement;
    }

    if (req.query.device) {
      if (!['desktop', 'mobile'].includes(req.query.device)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid device'
        });
      }

      filter.device = { $in: ['all', req.query.device] };
    }

    const advertisements = await Advertisement.find(filter)
      .select(
        'title description image targetUrl placement device startDate endDate'
      )
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: advertisements.length,
      data: advertisements
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Public: Record advertisement impression
exports.recordImpression = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement ID'
      });
    }

    const now = new Date();

    const advertisement = await Advertisement.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'approved',
        startDate: { $lte: now },
        endDate: { $gt: now }
      },
      {
        $inc: { impressions: 1 }
      },
      { new: true }
    ).select('_id impressions');

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement is not currently available'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Impression recorded'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Public: Record click and return destination URL
exports.recordClick = async (req, res) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid advertisement ID'
      });
    }

    const now = new Date();

    const advertisement = await Advertisement.findOneAndUpdate(
      {
        _id: req.params.id,
        status: 'approved',
        startDate: { $lte: now },
        endDate: { $gt: now }
      },
      {
        $inc: { clicks: 1 }
      },
      { new: true }
    ).select('targetUrl clicks');

    if (!advertisement) {
      return res.status(404).json({
        success: false,
        message: 'Advertisement is not currently available'
      });
    }

    res.status(200).json({
      success: true,
      targetUrl: advertisement.targetUrl
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Advertiser: Get campaign statistics
exports.getMyAdvertisementStats = async (req, res) => {
  try {
    const [stats] = await Advertisement.aggregate([
      {
        $match: {
          advertiser: req.user._id
        }
      },
      {
        $group: {
          _id: null,
          totalAdvertisements: { $sum: 1 },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          },
          paused: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paused'] }, 1, 0]
            }
          }
        }
      }
    ]);

    res.status(200).json({
      success: true,
      data: stats || {
        totalAdvertisements: 0,
        totalImpressions: 0,
        totalClicks: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        paused: 0
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

// Admin: Overall advertisement statistics
exports.getAdvertisementOverview = async (req, res) => {
  try {
    const [stats] = await Advertisement.aggregate([
      {
        $group: {
          _id: null,
          totalAdvertisements: { $sum: 1 },
          totalImpressions: { $sum: '$impressions' },
          totalClicks: { $sum: '$clicks' },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, 1, 0]
            }
          },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, 1, 0]
            }
          },
          rejected: {
            $sum: {
              $cond: [{ $eq: ['$status', 'rejected'] }, 1, 0]
            }
          },
          paused: {
            $sum: {
              $cond: [{ $eq: ['$status', 'paused'] }, 1, 0]
            }
          }
        }
      }
    ]);

    const active = await Advertisement.countDocuments({
      status: 'approved',
      startDate: { $lte: new Date() },
      endDate: { $gt: new Date() }
    });

    res.status(200).json({
      success: true,
      data: {
        ...(stats || {
          totalAdvertisements: 0,
          totalImpressions: 0,
          totalClicks: 0,
          pending: 0,
          approved: 0,
          rejected: 0,
          paused: 0
        }),
        active
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};
