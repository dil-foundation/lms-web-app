
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
    ArrowLeft, BookOpen, ChevronRight, Play, Eye, User, Handshake, Smile, Search, Users, Hand, HelpCircle, Edit, MessageCircle, Tag, SmilePlus, Smartphone, Inbox, Settings, Bell, ClipboardList, CheckSquare, Puzzle, PartyPopper, LucideIcon
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

// ============================================
// SUPABASE IMAGE HELPERS FOR LESSON 4
// ============================================

const SUPABASE_STAGE0_LESSON4_BASE = 'https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/lesson-4';

// Convert English phrase to filename used by storage
const slugifyToFilename = (text: string): string => {
    const raw = (text || '').toString().trim();
    // Remove punctuation we know is not present in filenames (., ?, !)
    const withoutPunct = raw.replace(/[\.?!,]/g, '');
    // Preserve apostrophes (') as %27, and encode spaces as %20
    return withoutPunct
        .replace(/'/g, '%27')
        .replace(/\s+/g, '%20');
};

// Per-page overrides for filename oddities or case differences
const LESSON4_FILENAME_OVERRIDES: Record<string, string> = {
    // greetings
    'greetings:My name is Ali': 'My%20name%20is%20ali',
    // useful-words
    "useful-words:I'm doing well.": 'I%27m%20doing%20well',
    'useful-words:My name is Aaliyah.': 'My%20name%20is%20alyah',
    'useful-words:How are you?': 'How%20are%20you',
    "useful-words:What's your name?": 'What%27s%20your%20name',
};

const getLesson4ImageUrl = (pageIndex: number, english: string) => {
    let folder = '';
    if (pageIndex === 0) folder = 'common-sight-words';
    else if (pageIndex === 1) folder = 'greetings';
    else if (pageIndex === 2) folder = 'useful-words';
    else if (pageIndex === 3) folder = 'ui-words';
    const key = `${folder}:${(english || '').toString().trim()}`;
    const file = LESSON4_FILENAME_OVERRIDES[key] || slugifyToFilename(english);
    return `${SUPABASE_STAGE0_LESSON4_BASE}/${folder}/${file}.png`;
};

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
            <div className="relative flex items-center justify-center mb-4 sm:mb-6">
                 <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 transition-all duration-300 hover:-translate-y-1/2 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-center px-12 sm:px-0">
                    <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl mb-2 sm:mb-3 shadow-lg">
                        <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    </div>
                    <h1 className="text-xl sm:text-2xl font-bold text-primary">{getTitleForStep()}</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Essential English Vocabulary</p>
                </div>
            </div>

            <div className="my-4 sm:my-6">
                <Progress value={progress} className="h-2 bg-gray-200 dark:bg-gray-700" />
                <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">{mainStep + 1} of {totalSteps}</p>
            </div>
            
            <div className="text-center mb-6 sm:mb-8">
                 <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl mb-2 sm:mb-3 shadow-lg">
                    <currentStepData.icon className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100">{currentStepData.title}</h2>
                <p className="text-muted-foreground max-w-md mx-auto text-sm sm:text-base">{currentStepData.description}</p>
            </div>

            <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
                 {areExercises(currentPageContent) ? (
                    (currentPageContent as Exercise[]).map((exercise, index) => (
                         <Card key={index} className="p-6 bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl"><Edit className="w-5 h-5 text-primary"/></div>
                                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">{exercise.exercise}</h3>
                            </div>
                            <p className="text-lg sm:text-xl text-center my-4">{exercise.sentence.split('____').map((part, i) => (
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
                                        className={`h-11 sm:h-12 text-sm sm:text-base transition-all duration-300 ${
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
                    <Card className="p-6 bg-gradient-to-br from-card to-card/50 dark:bg-card border border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl"><Edit className="w-6 h-6 text-primary"/></div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">{currentPageContent.exercise}</h3>
                        </div>
                        <p className="text-xl sm:text-2xl text-center my-6">{currentPageContent.sentence.split('____').map((part, i) => (
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
                                    className={`h-12 sm:h-14 text-base sm:text-lg transition-all duration-300 ${
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
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                        {(currentPageContent as Word[]).map((item, index) => (
                            <Card 
                                key={index} 
                                className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-2xl"
                            >
                                {/* Image Section */}
                                <div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <img 
                                        src={getLesson4ImageUrl(mainStep, item.word)} 
                                        alt={item.word}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                    {/* Play Button Overlay */}
                                    <div className="absolute bottom-3 right-3">
                                        <Button 
                                            size="icon" 
                                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl border-2 border-white/50 transition-all duration-300 ${
                                                loadingAudio === item.word 
                                                    ? 'bg-primary/70 cursor-not-allowed scale-95' 
                                                    : 'bg-primary hover:bg-primary/90 hover:scale-110'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePlayAudio(item.word);
                                            }}
                                            disabled={loadingAudio === item.word}
                                        >
                                            {loadingAudio === item.word ? (
                                                <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            ) : (
                                                <Play className="w-6 h-6 text-white" fill="white" />
                                            )}
                                        </Button>
                                    </div>
                                </div>
                                
                                {/* Content Section */}
                                <CardContent className="p-4 sm:p-5 space-y-3">
                                    <div className="flex items-center justify-between">
                                        <span className="text-xs sm:text-sm font-medium text-muted-foreground bg-primary/10 px-3 py-1 rounded-full">
                                            {item.pronunciation}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                            {item.word}
                                        </h3>
                                        <p className="font-urdu text-base sm:text-lg text-muted-foreground leading-relaxed">
                                            {item.translation}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <Button size="lg" className="w-full h-14 sm:h-16 text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg hover:shadow-xl transition-all duration-300" onClick={handleNext}>
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