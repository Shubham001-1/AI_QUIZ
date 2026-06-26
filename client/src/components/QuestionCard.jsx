import React, { useState, useEffect, useRef } from 'react';

const OPTION_LABELS = ['A', 'B', 'C', 'D'];

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
  alwaysShowCorrect = false,
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
    if (alwaysShowCorrect && index === correctOptionIndex) {
      return 'border-2 border-primary-container bg-primary/5 shadow-md';
    }
    if (!answered && !timeUp) {
      return 'bg-white border border-border-subtle hover:border-primary-container hover:shadow-md';
    }
    if (timeUp || answered) {
      if (index === correctOptionIndex) {
        return 'border-2 border-primary-container bg-primary/5 shadow-md';
      }
      if (answered && index === selectedOption && index !== correctOptionIndex) {
        return 'border-2 border-error-container bg-error/5 shadow-md opacity-80';
      }
      return 'bg-white border border-border-subtle opacity-50';
    }
    return 'bg-white border border-border-subtle';
  };

  const getLabelStyle = (index) => {
    if (alwaysShowCorrect && index === correctOptionIndex) {
      return 'bg-primary-container text-white';
    }
    if (!answered && !timeUp) {
      return 'border-2 border-border-subtle text-on-surface-variant group-hover:border-primary-container group-hover:text-primary-container';
    }
    if (timeUp || answered) {
      if (index === correctOptionIndex) {
        return 'bg-primary-container text-white';
      }
      if (answered && index === selectedOption && index !== correctOptionIndex) {
        return 'bg-error-container text-white';
      }
      return 'border-2 border-border-subtle text-on-surface-variant';
    }
    return 'border-2 border-border-subtle text-on-surface-variant';
  };

  const timerColor = timeLeft <= 5 ? 'bg-error' : timeLeft <= 10 ? 'bg-[#F4B400]' : 'bg-primary';

  return (
    <div className="w-full max-w-3xl mx-auto animate-slide-up">
      {/* Question Header */}
      <div className="bg-surface-container-lowest border border-border-subtle shadow-sm p-4 md:p-5 rounded-2xl mb-4">
        {/* Progress */}
        <div className="flex items-center justify-between mb-3">
          <span className="text-on-surface-variant text-sm font-label-bold uppercase tracking-wider">
            Question {questionIndex + 1} of {totalQuestions}
          </span>
          <div className="flex items-center gap-2">
            <span
              className={`text-2xl font-display font-bold transition-colors duration-300 ${
                timeLeft <= 5 ? 'text-error animate-pulse' : timeLeft <= 10 ? 'text-[#F4B400]' : 'text-primary'
              }`}
            >
              {timeLeft}s
            </span>
          </div>
        </div>

        {/* Timer Bar */}
        <div className="w-full h-2 bg-surface-container-high rounded-full overflow-hidden mb-6">
          <div
            className={`h-full ${timerColor} rounded-full transition-all duration-100 ease-linear`}
            style={{ width: `${timerWidth}%` }}
          />
        </div>

        {/* Question Text */}
        <h2 className="font-display font-bold text-lg sm:text-2xl text-on-surface text-center leading-relaxed">
          {question?.questionText}
        </h2>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {question?.options?.map((option, index) => {
          const isCorrect = (timeUp || answered || alwaysShowCorrect) && index === correctOptionIndex;
          const isWrong = answered && index === selectedOption && index !== correctOptionIndex;

          return (
            <button
              key={index}
              id={`option-${index}`}
              onClick={() => handleAnswer(index)}
              disabled={answered || timeUp}
              className={`
                group relative p-3 sm:p-4 rounded-xl text-left
                transition-all duration-200 cursor-pointer
                flex items-center gap-3
                ${getOptionStyle(index)}
                ${!answered && !timeUp ? 'hover:-translate-y-0.5 active:scale-[0.98]' : ''}
                ${answered && index === selectedOption ? 'scale-[1.02]' : ''}
                disabled:cursor-not-allowed
              `}
            >
              {/* Option Label */}
              <span className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm transition-all ${getLabelStyle(index)}`}>
                {OPTION_LABELS[index]}
              </span>
              <span className={`text-sm sm:text-base font-semibold leading-snug flex-1 ${isCorrect || isWrong ? 'text-on-surface' : 'text-on-surface'}`}>
                {option}
              </span>

              {/* Correct/Wrong indicator */}
              {isCorrect && (
                <span className="material-symbols-outlined text-primary-container text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>check_circle</span>
              )}
              {isWrong && (
                <span className="material-symbols-outlined text-error-container text-xl flex-shrink-0" style={{ fontVariationSettings: "'FILL' 1" }}>cancel</span>
              )}
            </button>
          );
        })}
      </div>

      {/* Time Up Message */}
      {timeUp && !answered && !alwaysShowCorrect && (
        <div className="mt-6 p-4 bg-error-container border border-error/20 rounded-xl text-center shadow-sm">
          <p className="text-on-error-container font-semibold">⏰ Time's up! You didn't answer in time.</p>
        </div>
      )}
    </div>
  );
};

export default QuestionCard;
