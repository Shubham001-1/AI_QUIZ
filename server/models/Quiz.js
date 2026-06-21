import mongoose from 'mongoose';

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: (v) => v.length === 4,
      message: 'Each question must have exactly 4 options',
    },
  },
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3,
  },
  points: {
    type: Number,
    default: 100,
  },
});

const leaderboardEntrySchema = new mongoose.Schema({
  userId: { type: String, required: true },
  name: { type: String, required: true },
  score: { type: Number, required: true },
  rank: { type: Number, required: true },
});

const quizSchema = new mongoose.Schema({
  topic: {
    type: String,
    required: [true, 'Topic is required'],
    trim: true,
  },
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    minlength: 6,
    maxlength: 6,
  },
  hostId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  status: {
    type: String,
    enum: ['saved', 'lobby', 'active', 'finished'],
    default: 'lobby',
  },
  questions: [questionSchema],
  finalLeaderboard: [leaderboardEntrySchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const Quiz = mongoose.model('Quiz', quizSchema);
export default Quiz;
