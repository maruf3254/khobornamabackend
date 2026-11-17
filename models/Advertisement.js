
const mongoose = require('mongoose');

// All available advertisement slots
const AD_SLOTS = {
  home_top: {
    placement: 'homepage',
    label: 'Homepage Top',
    width: 970,
    height: 90
  },
  home_middle_1: {
    placement: 'homepage',
    label: 'Homepage Middle 1',
    width: 970,
    height: 90
  },
  home_middle_2: {
    placement: 'homepage',
    label: 'Homepage Middle 2',
    width: 728,
    height: 90
  },
  home_middle_3: {
    placement: 'homepage',
    label: 'Homepage Middle 3',
    width: 728,
    height: 90
  },
  home_middle_4: {
    placement: 'homepage',
    label: 'Homepage Middle 4',
    width: 728,
    height: 90
  },
  home_sidebar_1: {
    placement: 'homepage',
    label: 'Homepage Sidebar 1',
    width: 300,
    height: 250
  },
  home_sidebar_2: {
    placement: 'homepage',
    label: 'Homepage Sidebar 2',
    width: 300,
    height: 250
  },

  category_top: {
    placement: 'category',
    label: 'Category Top',
    width: 970,
    height: 90
  },
  category_middle: {
    placement: 'category',
    label: 'Category Middle',
    width: 728,
    height: 90
  },
  category_sidebar: {
    placement: 'category',
    label: 'Category Sidebar',
    width: 300,
    height: 250
  },

  single_top: {
    placement: 'single',
    label: 'Single News Top',
    width: 970,
    height: 90
  },
  single_after_intro: {
    placement: 'single',
    label: 'Single News After Intro',
    width: 728,
    height: 90
  },
  single_middle: {
    placement: 'single',
    label: 'Single News Middle',
    width: 728,
    height: 90
  },
  single_after_content: {
    placement: 'single',
    label: 'Single News After Content',
    width: 728,
    height: 90
  },
  single_sidebar: {
    placement: 'single',
    label: 'Single News Sidebar',
    width: 300,
    height: 250
  }
};

const slotKeys = Object.keys(AD_SLOTS);

const advertisementSchema = new mongoose.Schema(
  {
    // Advertiser account
    advertiser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },

    // Advertisement information
    title: {
      type: String,
      required: [true, 'Advertisement title is required'],
      trim: true,
      maxlength: 150
    },

    description: {
      type: String,
      trim: true,
      maxlength: 500,
      default: ''
    },

    // Desktop / default banner image
    image: {
      type: String,
      required: [true, 'Advertisement image is required']
    },

    // Optional mobile banner image
    imageMobile: {
      type: String,
      default: ''
    },

    // Advertisement destination
    targetUrl: {
      type: String,
      required: [true, 'Target URL is required'],
      trim: true
    },

    // Exact advertisement slot
    slotKey: {
      type: String,
      enum: {
        values: slotKeys,
        message: 'Invalid advertisement slot'
      },
      required: [true, 'Advertisement slot is required'],
      index: true
    },

    // Page type: homepage, category or single
    placement: {
      type: String,
      enum: ['homepage', 'category', 'single'],
      required: true,
      index: true
    },

    // Supported device
    device: {
      type: String,
      enum: ['all', 'desktop', 'mobile'],
      default: 'all'
    },

    // Advertisement scheduling
    startDate: {
      type: Date,
      required: [true, 'Start date is required']
    },

    endDate: {
      type: Date,
      required: [true, 'End date is required']
    },

    // Rotation priority (higher value = higher priority)
    priority: {
      type: Number,
      default: 0,
      min: 0
    },

    // Advertisement status
    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'rejected',
        'paused',
        'expired'
      ],
      default: 'pending',
      index: true
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: ''
    },

    // Advertisement analytics
    impressions: {
      type: Number,
      default: 0,
      min: 0
    },

    clicks: {
      type: Number,
      default: 0,
      min: 0
    },

    // Approval information
    approvedAt: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true
  }
);

// Automatically determine placement from slotKey
advertisementSchema.pre('validate', function (next) {
  if (this.slotKey && AD_SLOTS[this.slotKey]) {
    this.placement = AD_SLOTS[this.slotKey].placement;
  }

  // Validate advertisement date range
  if (
    this.startDate &&
    this.endDate &&
    this.endDate <= this.startDate
  ) {
    this.invalidate(
      'endDate',
      'End date must be after start date'
    );
  }

  next();
});

// Useful indexes for advertisement queries
advertisementSchema.index({
  status: 1,
  slotKey: 1,
  device: 1,
  startDate: 1,
  endDate: 1
});

advertisementSchema.index({
  advertiser: 1,
  createdAt: -1
});

advertisementSchema.index({
  slotKey: 1,
  status: 1,
  priority: -1
});

// Export slot configuration for controllers
advertisementSchema.statics.AD_SLOTS = AD_SLOTS;

advertisementSchema.statics.getSlotConfig = function (slotKey) {
  return AD_SLOTS[slotKey] || null;
};

module.exports = mongoose.model(
  'Advertisement',
  advertisementSchema
);
