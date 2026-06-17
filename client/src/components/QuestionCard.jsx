import React, { useState, useEffect, useRef } from 'react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];
const OPTION_CLASSES = ['answer-a', 'answer-b', 'answer-c', 'answer-d'];

const QuestionCard = ({
  question,
  questionIndex,
  totalQuestions,
  timeLimit = 20,
  onAnswer,
  answered,
  selectedOption,
  correctOptionIndex,
  timeUp,
}) => {
  const [timeLeft, setTimeLeft] = useState(timeLimit);
  const [timerWidth, setTimerWidth] = useState(100);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now());

  useEffect(() => {
    // Reset on new question
    setTimeLeft(timeLimit);
    setTimerWidth(100);
    startTimeRef.current = Date.now();

    intervalRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTimeRef.current) / 1000;
      const remaining = Math.max(0, timeLimit - elapsed);
      setTimeLeft(Math.ceil(remaining));
      setTimerWidth((remaining / timeLimit) * 100);

      if (remaining <= 0) {
        clearInterval(intervalRef.current);
      }
    }, 100);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [questionIndex, timeLimit]);

  // Stop timer when answered or time up
  useEffect(() => {
    if (answered || timeUp) {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
  }, [answered, timeUp]);

  const handleAnswer = (index) => {
    if (answered || timeUp) return;
    const currentTimeLeft = Math.max(0, timeLimit - (Date.now() - startTimeRef.current) / 1000);
    onAnswer(index, currentTimeLeft);
  };

  const getOptionStyle = (index) => {
    if (!answered && !timeUp) {
      return OPTION_CLASSES[index];
    }
    if (timeUp || answered) {
      if (index === correctOptionIndex) {
        return 'bg-gradient-to-r from-emerald-600 to-emerald-500 ring-2 ring-emerald-400 ring-offset-2 ring-offset-transparent';
      }
      if (answered && index === selectedOption && index !== correctOptionIndex) {
        return 'bg-gradient-to-r from-red-700 to-red-600 ring-2 ring-red-400 ring-offset-2 ring-offset-transparent opacity-80';
      }
      return 'bg-white/5 opacity-50';
    }
    return OPTION_CLASSES[index];
  };

  const timerColor = timeLeft <= 5 ? 'bg-red-500' : timeLeft <= 10 ? 'bg-amber-500' : 'bg-brand-500';

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      {/* Question Header */}
      <div className="glass-card p-6 mb-4">
        {/* Progress */}
        <div className="flex items-center justify-between mb-4">
          <span className="text-white/50 text-sm font-medium">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-display font-bold transition-colors duration-300 ${
                timeLeft <= 5 ? 'text-red-400 animate-pulse' : timeLeft <= 10 ? 'text-amber-400' : 'text-white'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-2 bg-white/10 rounded-full overflow-hidden mb-5">
          <div
            className={`h-full ${timerColor} rounded-full transition-all duration-100 ease-linear`}
            style={{ width: `${timerWidth}%` }}
          />
        </div>

        {/* Question Text */}
        <h2 className="font-display font-bold text-xl sm:text-2xl text-white text-center leading-relaxed">
          {question?.questionText}
        </h2>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question?.options?.map((option, index) => (
          <button
            key={index}
            id={`option-${index}`}
            onClick={() => handleAnswer(index)}
            disabled={answered || timeUp}
            className={`
              relative p-4 sm:p-5 rounded-xl text-white font-semibold text-left
              transition-all duration-200 cursor-pointer
              flex items-center gap-3
              ${getOptionStyle(index)}
              ${!answered && !timeUp ? 'hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98]' : ''}
              ${answered && index === selectedOption ? 'scale-[1.02]' : ''}
              disabled:cursor-not-allowed
            `}
          >
            {/* Option Label */}
            <span className="flex-shrink-0 w-8 h-8 rounded-lg bg-black/20 flex items-center justify-center font-display font-bold text-sm">
              {OPTION_LABELS[index]}
            </span>
            <span className="text-sm sm:text-base leading-snug">{option}</span>

            {/* Correct/Wrong indicator */}
            {(timeUp || answered) && index === correctOptionIndex && (
              <span className="ml-auto text-lg">✓</span>
            )}
            {answered && index === selectedOption && index !== correctOptionIndex && (
              <span className="ml-auto text-lg">✗</span>
            )}
          </button>
        ))}
      </div>

      {/* Time Up Message */}
      {timeUp && !answered && (
        <div className="mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-xl text-center">
          <p className="text-red-300 font-semibold">⏰ Time's up! You didn't answer in time.</p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
