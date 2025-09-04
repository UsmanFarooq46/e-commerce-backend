const mongoose = require("mongoose");

const teacherModelSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, "Name is required"],
  },
  fatherName: {
    type: String,
    required: [true, "fatherName is required"],
  },
  gender: {
    type: String,
    required: [true, "gender is required"],
  },
  experience: [
    {
      title: {
        type: String,
        required: [true, "Title is required"],
      },
      fromDate: Date,
      toDate: Date,
      organization: {
        type: String,
        required: [true, "Organization is required"],
      },
    },
  ],
  recentQualification: {
    title: {
      type: String,
      required: [true, "Title is required"],
    },
    University_college: {
      type: String,
      required: [true, "University is required"],
    },
    fromDate: Date,
    toDate: Date,
  },
  age: {
    type: Number,
    required: [true, "Age is required"],
    min: 14,
    max: 80,
  },
  skills: [String],
  CINC: String,
  subject: String,
  address: String,
  phone: String,
  creted_at: {
    type: Date,
    default: Date.now,
  },
});

const teacherModel = mongoose.model("teacher", teacherModelSchema);
module.exports = teacherModel;
