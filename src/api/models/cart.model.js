const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1,
      max: 100
    },
    addedAt: {
      type: Date,
      default: Date.now
    },
    updatedAt: {
      type: Date,
      default: Date.now
    },
    notes: {
      type: String,
      maxlength: [200, "Notes cannot exceed 200 characters"]
    },
    // For variant products (size, color, etc.)
    variant: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    // Price at time of adding to cart (for price protection)
    priceAtTime: {
      type: Number,
      required: true
    },
    // Discount applied to this item
    discount: {
      type: Number,
      default: 0,
      min: 0
    },
    // Tax for this item
    tax: {
      type: Number,
      default: 0,
      min: 0
    }
  }],
  // Cart totals (calculated fields)
  subtotal: {
    type: Number,
    default: 0
  },
  totalDiscount: {
    type: Number,
    default: 0
  },
  totalTax: {
    type: Number,
    default: 0
  },
  totalAmount: {
    type: Number,
    default: 0
  },
  // Applied coupons/discounts
  appliedCoupons: [{
    couponCode: {
      type: String,
      required: true
    },
    discountAmount: {
      type: Number,
      required: true
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Shipping information
  shippingMethod: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShippingMethod'
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  // Cart metadata
  itemCount: {
    type: Number,
    default: 0
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  // Cart expiration
  expiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days
    }
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for better query performance
cartSchema.index({ userId: 1 });
cartSchema.index({ expiresAt: 1 });
cartSchema.index({ lastUpdated: -1 });

// Virtual for total items in cart
cartSchema.virtual('totalItems').get(function() {
  return this.items.reduce((total, item) => total + item.quantity, 0);
});

// Method to calculate totals
cartSchema.methods.calculateTotals = function() {
  let subtotal = 0;
  let totalDiscount = 0;
  let totalTax = 0;
  
  this.items.forEach(item => {
    const itemTotal = item.quantity * item.priceAtTime;
    subtotal += itemTotal;
    totalDiscount += item.discount;
    totalTax += item.tax;
  });
  
  // Add coupon discounts
  this.appliedCoupons.forEach(coupon => {
    totalDiscount += coupon.discountAmount;
  });
  
  this.subtotal = subtotal;
  this.totalDiscount = totalDiscount;
  this.totalTax = totalTax;
  this.totalAmount = subtotal - totalDiscount + totalTax + this.shippingCost;
  this.itemCount = this.totalItems;
  
  return this;
};

// Pre-save middleware to calculate totals
cartSchema.pre('save', function(next) {
  this.calculateTotals();
  this.lastUpdated = new Date();
  next();
});

// Method to add item to cart
cartSchema.methods.addItem = function(productId, quantity, variant = {}, priceAtTime, notes = '') {
  const existingItem = this.items.find(item => 
    item.productId.toString() === productId.toString() && 
    JSON.stringify(item.variant) === JSON.stringify(variant)
  );
  
  if (existingItem) {
    existingItem.quantity += quantity;
    existingItem.updatedAt = new Date();
  } else {
    this.items.push({
      productId,
      quantity,
      variant,
      priceAtTime,
      notes,
      addedAt: new Date(),
      updatedAt: new Date()
    });
  }
  
  return this.save();
};

// Method to remove item from cart
cartSchema.methods.removeItem = function(productId, variant = {}) {
  this.items = this.items.filter(item => 
    !(item.productId.toString() === productId.toString() && 
      JSON.stringify(item.variant) === JSON.stringify(variant))
  );
  return this.save();
};

// Method to clear cart
cartSchema.methods.clearCart = function() {
  this.items = [];
  this.appliedCoupons = [];
  this.shippingMethod = undefined;
  this.shippingCost = 0;
  return this.save();
};

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
