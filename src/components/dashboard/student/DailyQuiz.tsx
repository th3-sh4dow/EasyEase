'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Zap, Loader2, Check, X, RefreshCw } from 'lucide-react';
import { generateQuiz, type GenerateQuizOutput, type GenerateQuizInput } from '@/ai/flows/daily-quiz-flow';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/context/AuthContext';
import { useFirestore } from '@/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';


type QuizState = 'loading' | 'taking' | 'results';
type QuestionResult = 'unanswered' | 'correct' | 'incorrect';

export function DailyQuiz() {
  const { user } = useAuth();
  const firestore = useFirestore();

  const [quizState, setQuizState] = useState<QuizState>('loading');
  const [quizData, setQuizData] = useState<GenerateQuizOutput | null>(null);
  const [error, setError] = useState('');

  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [questionResults, setQuestionResults] = useState<Record<number, QuestionResult>>({});

  const startNewQuiz = async () => {
    setQuizState('loading');
    setError('');
    setCurrentQuestionIndex(0);
    setSelectedAnswers({});
    setQuestionResults({});
    setQuizData(null);
    try {
      const result = await generateQuiz({ topic: "React", difficulty: 'medium', questionCount: 5 });
      setQuizData(result);
      setQuizState('taking');
    } catch (err) {
      console.error(err);
      setError('Could not generate a quiz. Please try again in a moment.');
      setQuizState('loading'); // Stay in loading to show error
    }
  };

  useEffect(() => {
    startNewQuiz();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveQuizResult = (score: number, totalQuestions: number) => {
    if (!user || !firestore) return;

    const resultsCollectionRef = collection(firestore, `userProfiles/${user.uid}/quizResults`);
    const newResult = {
        score,
        totalQuestions,
        topic: "React", // Should be dynamic in a real app
        createdAt: serverTimestamp()
    };
    
    addDoc(resultsCollectionRef, newResult)
        .catch(error => {
            console.error("Error saving quiz result: ", error);
            errorEmitter.emit('permission-error', new FirestorePermissionError({
                path: resultsCollectionRef.path,
                operation: 'create',
                requestResourceData: newResult,
            }));
        });
  };

  const handleAnswerSubmit = () => {
    if (!quizData) return;
    const currentQuestion = quizData.questions[currentQuestionIndex];
    const selectedAnswer = selectedAnswers[currentQuestionIndex];
    
    if (!selectedAnswer) return;

    const isCorrect = selectedAnswer === currentQuestion.correctAnswer;
    setQuestionResults(prev => ({ ...prev, [currentQuestionIndex]: isCorrect ? 'correct' : 'incorrect' }));

    setTimeout(() => {
        if (currentQuestionIndex < quizData.questions.length - 1) {
            setCurrentQuestionIndex(prev => prev + 1);
        } else {
            setQuizState('results');
            const finalScore = Object.values(questionResults).filter(r => r === 'correct').length + (isCorrect ? 1 : 0);
            saveQuizResult(finalScore, quizData.questions.length);
        }
    }, 1000);
  };

  const score = Object.values(questionResults).filter(r => r === 'correct').length;
  const totalQuestions = quizData?.questions.length || 0;
  const scorePercentage = totalQuestions > 0 ? (score / totalQuestions) * 100 : 0;

  const renderContent = () => {
    switch (quizState) {
      case 'loading':
        return (
          <div className="text-center">
            <Loader2 className="h-12 w-12 mx-auto animate-spin text-primary mb-4" />
            <h2 className="text-xl font-semibold">Generating Your Daily Quiz...</h2>
            <p className="text-muted-foreground">The AI is crafting the perfect questions for you.</p>
            {error && <p className="text-sm text-destructive mt-4">{error}</p>}
          </div>
        );
      case 'taking':
        if (!quizData) return null;
        const question = quizData.questions[currentQuestionIndex];
        const result = questionResults[currentQuestionIndex];
        return (
          <div>
            <Progress value={((currentQuestionIndex + 1) / quizData.questions.length) * 100} className="mb-4" />
            <p className="text-sm text-muted-foreground mb-2">Question {currentQuestionIndex + 1} of {quizData.questions.length}</p>
            <h3 className="text-xl font-semibold mb-6">{question.question}</h3>
            <RadioGroup
              value={selectedAnswers[currentQuestionIndex]}
              onValueChange={(value) => setSelectedAnswers(prev => ({...prev, [currentQuestionIndex]: value}))}
              disabled={!!result}
              className="space-y-3"
            >
              {question.options.map((option, index) => {
                const isSelected = selectedAnswers[currentQuestionIndex] === option;
                const isCorrect = question.correctAnswer === option;
                return (
                  <Label 
                    key={index}
                    className={cn(
                        "flex items-center gap-4 p-4 border rounded-lg cursor-pointer transition-all",
                        result && isCorrect && "border-green-500 bg-green-500/10",
                        result && isSelected && !isCorrect && "border-red-500 bg-red-500/10",
                        !result && isSelected && "border-primary",
                        !result && !isSelected && "border-border hover:border-primary/50"
                    )}
                  >
                    <RadioGroupItem value={option} />
                    <span>{option}</span>
                    {result && isCorrect && <Check className="ml-auto h-5 w-5 text-green-500" />}
                    {result && isSelected && !isCorrect && <X className="ml-auto h-5 w-5 text-red-500" />}
                  </Label>
                );
              })}
            </RadioGroup>
            <Button onClick={handleAnswerSubmit} disabled={!selectedAnswers[currentQuestionIndex] || !!result} className="mt-6 w-full">
              {result ? 'Next Question' : 'Submit Answer'}
            </Button>
          </div>
        );
        case 'results':
            return (
                <div className="text-center max-w-md mx-auto">
                    <h2 className="text-2xl font-bold mb-2">Quiz Complete!</h2>
                    <p className="text-muted-foreground mb-6">Here's how you did:</p>
                    
                    <div className="relative h-32 w-32 mx-auto mb-6">
                        <svg className="h-full w-full" viewBox="0 0 36 36">
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                className="text-muted/50"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                            />
                            <path
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                className={cn("transition-all duration-1000 ease-out", scorePercentage >= 80 ? "text-green-500" : scorePercentage >= 50 ? "text-yellow-500" : "text-red-500")}
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2.5"
                                strokeDasharray={`${scorePercentage}, 100`}
                            />
                        </svg>
                         <div className="absolute inset-0 flex flex-col items-center justify-center">
                            <span className="text-4xl font-bold">{score} / {totalQuestions}</span>
                            <span className="text-sm text-muted-foreground">Correct</span>
                        </div>
                    </div>
                   
                    <Button size="lg" onClick={startNewQuiz} className="w-full">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Take Another Quiz
                    </Button>
                </div>
            );
    }
  };

  return (
    <div className="h-full w-full animate-fade-in">
        <div className="flex items-center gap-3 mb-8">
            <Zap className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold font-headline">Daily Quiz Challenge</h1>
        </div>
      <Card>
        <CardContent className="p-8 flex items-center justify-center min-h-[400px]">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  );
}
