
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
    ArrowLeft, BookOpen, ChevronRight, Play, Eye, User, Handshake, Smile, Search, Users, Hand, HelpCircle, Edit, MessageCircle, Tag, SmilePlus, Smartphone, Inbox, Settings, Bell, ClipboardList, CheckSquare, Puzzle, PartyPopper, LucideIcon
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

// --- Type Definitions ---
interface Word {
    icon: LucideIcon;
    word: string;
    pronunciation: string;
    translation: string;
}

interface Exercise {
    type: "fill-in-the-blank";
    exercise: string;
    sentence: string;
    options: string[];
    answer: string;
}

type LessonPage = Word[] | Exercise | Exercise[];

interface LessonStep {
    title: string;
    icon: LucideIcon;
    description: string;
    pages: LessonPage[];
}

// --- Lesson Data ---
const sightWordsData: LessonStep[] = [
  {
    title: "Common Sight Words",
    icon: Eye,
    description: "Essential words for everyday communication, with Urdu translations.",
    pages: [
        [
            { icon: User, word: "I", pronunciation: "(aai)", translation: "میں" },
            { icon: User, word: "You", pronunciation: "(yoo)", translation: "تم" },
            { icon: User, word: "He", pronunciation: "(hee)", translation: "وہ (مرد)" },
            { icon: User, word: "She", pronunciation: "(shee)", translation: "وہ (عورت)" },
            { icon: Search, word: "It", pronunciation: "(it)", translation: "یہ" },
            { icon: Users, word: "We", pronunciation: "(wee)", translation: "ہم" },
        ]
    ]
  },
  {
    title: "Greetings",
    icon: Handshake,
    description: "Learn essential English greetings and introductory phrases with Urdu translations.",
    pages: [
        [
            { icon: Hand, word: "Hello", pronunciation: "(he-lo)", translation: "السلام علیکم" },
            { icon: HelpCircle, word: "How are you?", pronunciation: "(how ar yoo)", translation: "تم کیسے ہو؟" },
            { icon: Edit, word: "My name is Ali", pronunciation: "(mai neim iz aa-lee)", translation: "میرا نام علی ہے" },
        ]
    ]
  },
  {
    title: "Useful Phrases",
    icon: MessageCircle,
    description: "Everyday phrases for better communication.",
    pages: [
        [
            { icon: MessageCircle, word: "How are you?", pronunciation: "(how ar yoo)", translation: "آپ کیسے ہیں؟" },
            { icon: Smile, word: "I'm doing well.", pronunciation: "(aaim doo-ing wel)", translation: "میں ٹھیک ہوں" },
            { icon: Tag, word: "What's your name?", pronunciation: "(wats yor neim)", translation: "تمہارا نام کیا ہے؟" },
            { icon: User, word: "My name is Aaliyah.", pronunciation: "(mai neim iz aa-lee-ya)", translation: "میرا نام عالیہ ہے" },
            { icon: SmilePlus, word: "Nice to meet you.", pronunciation: "(nais to meet yoo)", translation: "تم سے مل کر خوشی ہوئی" },
        ]
    ]
  },
  {
    title: "UI Words",
    icon: Smartphone,
    description: "Common UI words you'll encounter in apps and websites.",
    pages: [
        [
            { icon: Inbox, word: "Inbox", pronunciation: "(in-boks)", translation: "ان باکس" },
            { icon: Settings, word: "Settings", pronunciation: "(set-ings)", translation: "سیٹنگز" },
            { icon: Bell, word: "Notifications", pronunciation: "(no-ti-fi-ka-shuns)", translation: "اطلاعات" },
            { icon: ClipboardList, word: "Options", pronunciation: "(op-shuns)", translation: "اختیارات" },
            { icon: CheckSquare, word: "Select", pronunciation: "(se-lekt)", translation: "منتخب کریں" },
        ]
    ]
  },
  {
    title: "Exercises",
    icon: Puzzle,
    description: "Test your knowledge with these interactive exercises.",
    pages: [
      [
        {
            type: "fill-in-the-blank",
            exercise: "Exercise 1",
            sentence: "____ is a beautiful day.",
            options: ["It", "I", "You"],
            answer: "It",
        },
        {
            type: "fill-in-the-blank",
            exercise: "Exercise 2",
            sentence: "Can you ____ me?",
            options: ["help", "see", "call", "find"],
            answer: "help",
        },
        {
            type: "fill-in-the-blank",
            exercise: "Exercise 3",
            sentence: "____ is my name.",
            options: ["This", "That", "It", "What"],
            answer: "What",
        },
      ]
    ]
  }
];

// --- Type Guard ---
function isExercise(page: LessonPage): page is Exercise {
    return !Array.isArray(page) && page.type === 'fill-in-the-blank';
}

function areExercises(page: LessonPage): page is Exercise[] {
    return Array.isArray(page) && page.length > 0 && 'exercise' in page[0];
}

const SightWordsLesson = () => {
    const navigate = useNavigate();
    const [mainStep, setMainStep] = useState(0);
    const [subStep, setSubStep] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
    const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
    const { playAudio } = useAudioPlayer();

    // Cleanup effect to stop speech synthesis on component unmount
    useEffect(() => {
        return () => {
            if ('speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
        };
    }, []);

    // Function to play text-to-speech audio
    const handlePlayAudio = async (word: string) => {
        if (loadingAudio) return; // Prevent multiple simultaneous plays
        
        setLoadingAudio(word);
        try {
            // Use browser's Speech Synthesis API
            if ('speechSynthesis' in window) {
                // Stop any current speech
                window.speechSynthesis.cancel();
                
                const utterance = new SpeechSynthesisUtterance(word);
                utterance.lang = 'en-US';
                utterance.rate = 0.8; // Slightly slower for learning
                utterance.pitch = 1;
                utterance.volume = 1;
                
                // Set up event handlers
                utterance.onend = () => {
                    setLoadingAudio(null);
                };
                
                utterance.onerror = () => {
                    setLoadingAudio(null);
                    console.error('Speech synthesis error');
                };
                
                window.speechSynthesis.speak(utterance);
            } else {
                console.warn('Speech synthesis not supported');
                setLoadingAudio(null);
            }
        } catch (error) {
            console.error('Error playing audio:', error);
            setLoadingAudio(null);
        }
    };

    const currentStepData = sightWordsData[mainStep];
    const totalSteps = sightWordsData.length;
    const progress = ((mainStep + 1) / totalSteps) * 100;
    
    const handleSelectOption = (exerciseIndex: number, option: string) => {
        setSelectedAnswers(prev => ({ ...prev, [exerciseIndex]: option }));
    };

    const handleNext = () => {
        const currentPages = currentStepData.pages;
        if (subStep < currentPages.length - 1) {
            setSubStep(subStep + 1);
        } else {
            if (mainStep < totalSteps - 1) {
                setMainStep(mainStep + 1);
                setSubStep(0);
                setSelectedAnswers({});
            } else {
                navigate(-1); // Finish lesson
            }
        }
    };
    
    const currentPageContent = currentStepData.pages[subStep];

    const getTitleForStep = () => {
        if(currentStepData.title === "Exercises") return "Exercises";
        const titles: Record<string, string> = {
            "Common Sight Words": "Sight Words",
            "Greetings": "Greetings",
            "Useful Phrases": "Useful Phrases",
            "UI Words": "UI Words",
        }
        return titles[currentStepData.title] || "Sight Words"
    }

    return (
        <div className="w-full">
            <div className="relative flex items-center justify-center mb-6">
                 <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 hover:-translate-y-1/2 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                    <div className="inline-block p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl mb-3 shadow-lg">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl font-bold text-primary">{getTitleForStep()}</h1>
                    <p className="text-muted-foreground">Essential English Vocabulary</p>
                </div>
            </div>

            <div className="my-6">
                <Progress value={progress} className="h-2 bg-gray-200 dark:bg-gray-700" />
                <p className="text-center text-sm text-muted-foreground mt-2">{mainStep + 1} of {totalSteps}</p>
            </div>
            
            <div className="text-center mb-8">
                 <div className="inline-block p-4 bg-gradient-to-br from-[#1582B4]/10 to-[#1582B4]/20 rounded-2xl mb-3 shadow-lg">
                    <currentStepData.icon className="h-8 w-8 text-[#1582B4]" />
                </div>
                <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100">{currentStepData.title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto">{currentStepData.description}</p>
            </div>

            <div className="space-y-4 mb-8">
                 {areExercises(currentPageContent) ? (
                    (currentPageContent as Exercise[]).map((exercise, index) => (
                         <Card key={index} className="p-6 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl"><Edit className="w-5 h-5 text-primary"/></div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{exercise.exercise}</h3>
                            </div>
                            <p className="text-xl text-center my-4">{exercise.sentence.split('____').map((part, i) => (
                                <React.Fragment key={i}>
                                    {part}
                                    {i < exercise.sentence.split('____').length - 1 && <span className="inline-block w-16 h-0.5 bg-gray-300 dark:bg-gray-600 align-middle mx-2"></span>}
                                </React.Fragment>
                            ))}</p>
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                               {exercise.options.map(option => (
                                    <Button 
                                        key={option}
                                        variant={selectedAnswers[index] === option ? 'default' : 'outline'}
                                        className={`h-12 text-base transition-all duration-300 ${
                                            selectedAnswers[index] === option 
                                                ? 'bg-primary hover:bg-primary/90 shadow-lg' 
                                                : 'hover:bg-primary/10 hover:border-primary/30'
                                        }`}
                                        onClick={() => handleSelectOption(index, option)}
                                    >
                                        {option}
                                    </Button>
                               ))}
                            </div>
                        </Card>
                    ))
                 ) : isExercise(currentPageContent) ? (
                    <Card className="p-6 bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl"><Edit className="w-6 h-6 text-primary"/></div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-gray-100">{currentPageContent.exercise}</h3>
                        </div>
                        <p className="text-2xl text-center my-6">{currentPageContent.sentence.split('____').map((part, i) => (
                            <React.Fragment key={i}>
                                {part}
                                {i < currentPageContent.sentence.split('____').length - 1 && <span className="inline-block w-20 h-1 bg-gray-300 dark:bg-gray-600 align-middle mx-2"></span>}
                            </React.Fragment>
                        ))}</p>
                        <div className="grid grid-cols-2 gap-3">
                           {currentPageContent.options.map(option => (
                                <Button 
                                    key={option}
                                    variant={selectedAnswers[subStep] === option ? 'default' : 'outline'}
                                    className={`h-14 text-lg transition-all duration-300 ${
                                        selectedAnswers[subStep] === option 
                                            ? 'bg-primary hover:bg-primary/90 shadow-lg' 
                                            : 'hover:bg-primary/10 hover:border-primary/30'
                                    }`}
                                    onClick={() => handleSelectOption(subStep, option)}
                                >
                                    {option}
                                </Button>
                           ))}
                        </div>
                    </Card>
                ) : (
                    (currentPageContent as Word[]).map((item, index) => (
                        <Card key={index} className="p-6 flex items-center bg-gradient-to-br from-white/60 to-gray-50/60 dark:from-gray-900/60 dark:to-gray-800/60 border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold flex items-center gap-3 text-gray-900 dark:text-gray-100">
                                    {item.word}
                                    <span className="text-lg text-muted-foreground font-normal">{item.pronunciation}</span>
                                </h3>
                                <p className="font-urdu text-muted-foreground text-xl">{item.translation}</p>
                            </div>
                            <Button 
                                size="icon" 
                                className={`w-14 h-14 rounded-full shadow-lg transition-all duration-300 ${
                                    loadingAudio === item.word 
                                        ? 'bg-primary/60 cursor-not-allowed' 
                                        : 'bg-primary hover:bg-primary/90 hover:scale-105'
                                }`}
                                onClick={() => handlePlayAudio(item.word)}
                                disabled={loadingAudio === item.word}
                            >
                                {loadingAudio === item.word ? (
                                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Play className="w-6 h-6" />
                                )}
                            </Button>
                        </Card>
                    ))
                )}
            </div>

            <Button size="lg" className="w-full h-16 text-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" onClick={handleNext}>
                {mainStep === totalSteps - 1 && subStep === currentStepData.pages.length - 1 ? 
                    <>
                        <PartyPopper className="w-6 h-6 mr-2" />
                        Complete Lesson
                    </>
                    : 
                    <>
                        Continue
                        <ChevronRight className="w-5 h-5 ml-2" />
                    </>
                }
            </Button>
        </div>
    );
};

export default SightWordsLesson; 