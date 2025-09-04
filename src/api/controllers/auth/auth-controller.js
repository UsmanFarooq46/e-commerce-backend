const { User, Preferences, Cart } = require("./../../models");
const errorResp = require("./../../../utils/error_response");
const bcrypt = require("bcryptjs");
const validations = require("../../validations/validations");
const jwt = require("jsonwebtoken");

const addNewUser = async (req, res, next) => {
  try {
    const { error } = validations.registrationValidation(req.body);
    if (error) {
      return next(new errorResp("", error.details[0].message, 400));
    }

    const emailExists = await User.findOne({
      email: req.body.email.toLowerCase(),
      isDeleted: false
    });
    
    if (emailExists) {
      return next(new errorResp("", "Email Already Exists", 400));
    }

    // Set default role for new users
    req.body.role = req.body.role || "customer";
    
    // Handle profile image if provided
    if (req.file) {
      req.body.profileImage = req.file.path; // Assuming multer is used for file upload
    }
    
    // Hash the password
    if (req.body?.password) {
      const salt = await bcrypt.genSalt(12);
      const hashPassword = await bcrypt.hash(req.body.password, salt);
      req.body.password = hashPassword;
    }

    // Create new user
    const newUser = new User(req.body);
    const savedUser = await newUser.save();

    // Create default preferences for the user
    const defaultPreferences = new Preferences({
      userId: savedUser._id,
      currency: req.body.currency || 'Rs',
      language: req.body.language || 'en',
      timezone: req.body.timezone || 'Asia/Karachi'
    });
    await defaultPreferences.save();

    // Create empty cart for the user
    const newCart = new Cart({
      userId: savedUser._id
    });
    await newCart.save();

    // Remove password from response
    const userResponse = savedUser.toObject();
    delete userResponse.password;

    res.status(201).json({
      success: true,
      message: "User registered successfully",
      data: userResponse
    });
  } catch (error) {
    next(new errorResp(error, "Registration failed", 500));
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const allUsers = await User.find({ isDeleted: false })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: allUsers.length,
      data: allUsers
    });
  } catch (error) {
    next(new errorResp(error, `Users not found in database`, 404));
  }
};

const getAllActiveUsers = async (req, res, next) => {
  try {
    const activeUsers = await User.find({ 
      isDeleted: false, 
      isActive: true 
    })
      .select('-password')
      .sort({ createdAt: -1 });
    
    res.status(200).json({
      success: true,
      count: activeUsers.length,
      data: activeUsers
    });
  } catch (error) {
    next(new errorResp(error, `Active users not found in database`, 404));
  }
};

const getUserById = async (req, res, next) => {
  try {
    const userId = req.params.id || req.user._id; // Support both /profile and /users/:id
    const userData = await User.findById(userId)
      .select('-password');
    
    if (!userData) {
      return next(new errorResp("", "User not found", 404));
    }
    
    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (err) {
    next(new errorResp(err, "Error fetching user", 500));
  }
};

const getCurrentUserProfile = async (req, res, next) => {
  try {
    const userData = await User.findById(req.user._id)
      .select('-password');
    
    if (!userData) {
      return next(new errorResp("", "User not found", 404));
    }
    
    res.status(200).json({
      success: true,
      data: userData
    });
  } catch (err) {
    next(new errorResp(err, "Error fetching profile", 500));
  }
};

const login = async (req, res, next) => {
  try {
    const { error } = validations.loginValidation(req.body);
    if (error) return next(new errorResp(error, error.details[0].message, 400));

    const user = await User.findOne({ 
      email: req.body.email.toLowerCase(),
      isDeleted: false 
    });
    
    if (!user) {
      return next(
        new errorResp("", `User not found under the email ${req.body.email}`, 404)
      );
    }

    if (!user.isActive) {
      return next(
        new errorResp(
          "",
          "Your account has been disabled. Please contact admin to activate it",
          400
        )
      );
    }

    const validPass = await bcrypt.compare(req.body.password, user.password);
    if (!validPass) {
      return next(new errorResp("", "Invalid email or password", 400));
    }

    // Update last login
    user.lastLogin = new Date();
    user.loginAttempts = 0;
    await user.save();

    const token = jwt.sign(
      { 
        _id: user._id, 
        role: user.role, 
        email: user.email,
        date: new Date().toDateString() 
      },
      process.env.token_private,
      { expiresIn: "14d" }
    );

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.header("auth-token", token).json({ 
      success: true,
      message: "Login successful",
      token: token, 
      userData: userResponse 
    });
  } catch (error) {
    next(new errorResp(error, "Login failed", 500));
  }
};

const changeForgotPassword = async (req, resp, next) => {
  try {
    const { error } = validations.forgotPassValidations(req.body);
    if (error) return next(new errorResp(error, error.details[0].message, 400));
    
    const user = await User.findOne({
      email: req.body.email.toLowerCase(),
      isDeleted: false
    });
    
    if (!user) {
      return next(
        new errorResp(
          "",
          `No user found with email ${req.body.email}`,
          404
        )
      );
    }

    // Hash new password
    if (req.body?.newPass) {
      const salt = await bcrypt.genSalt(12);
      const hashPassword = await bcrypt.hash(req.body.newPass, salt);
      req.body.newPass = hashPassword;
    }

    const updatedUser = await User.findByIdAndUpdate(
      user._id,
      { 
        password: req.body.newPass,
        passwordResetToken: null,
        passwordResetExpires: null
      },
      { new: true }
    ).select('-password');

    resp.status(200).json({
      success: true,
      message: "Password updated successfully",
      data: updatedUser
    });
  } catch (err) {
    next(new errorResp(err, "Forgot password error", 500));
  }
};

const updateUserProfile = async (req, res, next) => {
  try {
    const { error } = validations.profileUpdateValidation(req.body);
    if (error) {
      return next(new errorResp("", error.details[0].message, 400));
    }

    const updateData = { ...req.body };
    
    // Handle profile image if provided
    if (req.file) {
      updateData.profileImage = req.file.path;
    }
    
    // Don't allow role updates through this endpoint for security
    delete updateData.role;
    delete updateData.email; // Email should be updated through separate endpoint
    
    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');
    
    if (!updatedUser) {
      return next(new errorResp("", "User not found", 404));
    }
    
    res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      data: updatedUser
    });
  } catch (error) {
    next(new errorResp(error, "Profile update failed", 500));
  }
};

const updateProfileImage = async (req, res, next) => {
  try {
    if (!req.file) {
      return next(new errorResp("", "Profile image is required", 400));
    }

    const updatedUser = await User.findByIdAndUpdate(
      req.user._id,
      { profileImage: req.file.path },
      { new: true }
    ).select('-password');
    
    if (!updatedUser) {
      return next(new errorResp("", "User not found", 404));
    }
    
    res.status(200).json({
      success: true,
      message: "Profile image updated successfully",
      data: {
        profileImage: updatedUser.profileImage
      }
    });
  } catch (error) {
    next(new errorResp(error, "Profile image update failed", 500));
  }
};

const disAbleUser = async (req, res, next) => {
  try {
    const updateUser = await User.findByIdAndUpdate(
      req.params.id,
      { 
        isActive: false,
        isDeleted: true 
      },
      { new: true }
    ).select('-password');
    
    if (!updateUser) {
      return next(new errorResp("", "User not found", 404));
    }
    
    res.status(200).json({
      success: true,
      message: "User disabled successfully",
      data: updateUser
    });
  } catch (error) {
    next(new errorResp(error, "Error in disabling user", 500));
  }
};

module.exports = {
  addNewUser,
  login,
  getAllUsers,
  getAllActiveUsers,
  getUserById,
  getCurrentUserProfile,
  updateUserProfile,
  updateProfileImage,
  changeForgotPassword,
  disAbleUser
};
