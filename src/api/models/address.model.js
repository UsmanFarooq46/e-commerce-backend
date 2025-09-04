const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['billing', 'shipping', 'both'],
    required: true
  },
  // Contact Information
  firstName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, "First name cannot exceed 50 characters"]
  },
  lastName: {
    type: String,
    required: true,
    trim: true,
    maxlength: [50, "Last name cannot exceed 50 characters"]
  },
  company: {
    type: String,
    trim: true,
    maxlength: [100, "Company name cannot exceed 100 characters"]
  },
  phone: {
    type: String,
    trim: true,
    match: [/^[\+]?[1-9][\d]{0,15}$/, "Please enter a valid phone number"]
  },
  // Address Information
  street: {
    type: String,
    required: true,
    trim: true,
    maxlength: [200, "Street address cannot exceed 200 characters"]
  },
  street2: {
    type: String,
    trim: true,
    maxlength: [200, "Street address line 2 cannot exceed 200 characters"]
  },
  city: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, "City name cannot exceed 100 characters"]
  },
  state: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, "State name cannot exceed 100 characters"]
  },
  postalCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: [20, "Postal code cannot exceed 20 characters"]
  },
  country: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, "Country name cannot exceed 100 characters"],
    default: 'United States'
  },
  countryCode: {
    type: String,
    required: true,
    trim: true,
    maxlength: [2, "Country code must be 2 characters"],
    default: 'US',
    uppercase: true
  },
  // Address Status
  isDefault: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  // Additional Information
  instructions: {
    type: String,
    maxlength: [500, "Delivery instructions cannot exceed 500 characters"]
  },
  // Geolocation (optional)
  coordinates: {
    latitude: {
      type: Number,
      min: -90,
      max: 90
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180
    }
  },
  // Address validation
  isVerified: {
    type: Boolean,
    default: false
  },
  verificationDate: Date,
  // Usage tracking
  lastUsed: Date,
  usageCount: {
    type: Number,
    default: 0
  },
  // Tags for organization
  tags: [{
    type: String,
    trim: true,
    maxlength: [30, "Tag cannot exceed 30 characters"]
  }]
}, {
  timestamps: true
});

// Index for better query performance
addressSchema.index({ userId: 1, type: 1 });
addressSchema.index({ userId: 1, isDefault: 1 });
addressSchema.index({ userId: 1, isActive: 1 });
addressSchema.index({ countryCode: 1, state: 1, city: 1 });

// Virtual for full name
addressSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Virtual for full address
addressSchema.virtual('fullAddress').get(function() {
  let address = this.street;
  if (this.street2) address += `, ${this.street2}`;
  address += `, ${this.city}, ${this.state} ${this.postalCode}, ${this.country}`;
  return address;
});

// Pre-save middleware to ensure only one default address per type per user
addressSchema.pre('save', async function(next) {
  if (this.isDefault && this.isActive) {
    await this.constructor.updateMany(
      { 
        userId: this.userId, 
        type: this.type,
        _id: { $ne: this._id } 
      },
      { isDefault: false }
    );
  }
  next();
});

// Method to mark as default
addressSchema.methods.setAsDefault = function() {
  this.isDefault = true;
  return this.save();
};

// Method to update usage
addressSchema.methods.updateUsage = function() {
  this.lastUsed = new Date();
  this.usageCount += 1;
  return this.save();
};

// Static method to get default address by type
addressSchema.statics.getDefaultByType = function(userId, type) {
  return this.findOne({ 
    userId, 
    type, 
    isDefault: true, 
    isActive: true 
  });
};

// Static method to get all addresses by type
addressSchema.statics.getByType = function(userId, type) {
  return this.find({ 
    userId, 
    type, 
    isActive: true 
  }).sort({ isDefault: -1, lastUsed: -1 });
};

const Address = mongoose.model("Address", addressSchema);
module.exports = Address;
