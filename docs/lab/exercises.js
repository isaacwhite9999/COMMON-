/* Known-answer scenarios for the Research Studio curriculum. */
(() => {
'use strict';
const exercises = {
  hypothesis: {
    question: 'Which statement can be falsified with a predeclared test?',
    choices: [
      ['trend', 'Trend strategies outperform when conditions are favorable.'],
      ['benchmark', 'From 2021 to 2025, the fixed rule will earn a higher net total return than buy-and-hold on the same fund.'],
      ['future', 'This approach will eventually beat the market.']
    ],
    answer: 'benchmark',
    explanation: 'A fixed rule, evaluation period, comparison and metric make it possible to observe a result that contradicts the claim.'
  },
  provenance: {
    question: 'In this hypothetical example, one share closes at $100. After a 2-for-1 split, each share closes at $50. What is the return attributable to the split alone?',
    choices: [['down', '−50%'], ['flat', '0%'], ['up', '+100%']],
    answer: 'flat',
    explanation: 'The holding changes from one share worth $100 to two shares worth $50 each. Use split-adjusted prices to avoid recording a fictitious loss.'
  },
  lookahead: {
    question: 'A signal uses Monday’s closing price. Under the Studio’s close-to-close backtest convention, which is the first return interval that can use the signal?',
    choices: [
      ['friday', 'Friday close to Monday close'],
      ['monday', 'Monday close to Tuesday close'],
      ['tuesday', 'Tuesday close to Wednesday close']
    ],
    answer: 'tuesday',
    explanation: 'The signal becomes available only after Monday’s close. The Studio models execution at the next close, so the position first earns the Tuesday-to-Wednesday return.'
  },
  holdout: {
    question: 'You tune your moving-average window after viewing the holdout result. How should you use that period now?',
    choices: [
      ['dev', 'Treat it as development data and reserve a later untouched period for confirmation.'],
      ['same', 'Use it as an independent holdout if you tune only one parameter.'],
      ['shuffle', 'Shuffle the days and reuse them as a fresh independent holdout.']
    ],
    answer: 'dev',
    explanation: 'The result influenced your model selection, so the period is development data. Reserve a later period and freeze the rule before opening it.'
  },
  costs: {
    question: 'A strategy moves from cash to a fully invested long position before a hypothetical 1.00% gain. With a commission of 10 basis points and slippage of 20 basis points, what is the net return for that interval?',
    choices: [['gross', '1.00%'], ['net', '0.70%'], ['cost', '0.30%']],
    answer: 'net',
    explanation: 'On a full position change, 30 basis points of costs equal 0.30 percentage points. The net return is 1.00% − 0.30% = 0.70%.'
  },
  sharpe: {
    question: 'A hypothetical strategy averages a daily excess return of 0.10%, with a daily sample standard deviation of 1.00%. Using 252 sessions, what is its approximate annualized Sharpe ratio?',
    choices: [['daily', '0.10'], ['annual', '1.59'], ['linear', '25.20']],
    answer: 'annual',
    explanation: 'Divide 0.10% by 1.00%, then multiply by √252. The resulting ratio is approximately 1.59 and has no units.'
  },
  drawdown: {
    question: 'A hypothetical equity curve takes values 100, 125, 100, then 120. What is the magnitude of maximum drawdown?',
    choices: [['flat', '0%'], ['end', '4%'], ['trough', '20%']],
    answer: 'trough',
    explanation: 'The largest decline from a running peak is from 125 to 100. The loss is 25 ÷ 125 = 20%.'
  },
  bootstrap: {
    question: 'A block-bootstrap simulation reports a 10% fraction of paths with losses. What does that figure describe?',
    choices: [
      ['future', 'The guaranteed probability of a loss next year.'],
      ['sample', 'The fraction with losses in resampled paths under this sample and procedure.'],
      ['limit', 'The largest possible future loss.']
    ],
    answer: 'sample',
    explanation: 'The fraction is conditional on the input sample, block size and horizon. Future market regimes can contain patterns and losses absent from the sample.'
  }
};

const progressKey = lesson => 'exercise-v1-' + lesson;
function grade(lesson, choice) {
  const exercise = exercises[lesson];
  if (!exercise || !exercise.choices?.some(([id]) => id === choice)) return null;
  const correct = choice === exercise.answer;
  return { correct, message: correct ? exercise.explanation : 'Review the lesson and try another answer.' };
}

window.CommonResearchExercises = { exercises, progressKey, grade };
})();
