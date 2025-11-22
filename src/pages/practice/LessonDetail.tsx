import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { 
    ArrowLeft, Play, BookOpen, ChevronRight, Music, Pencil, Volume2, Target, Wind, Sun, 
    Crown, Armchair, GlassWater, SmilePlus, Cat, Dog, Hash, Calendar, Palette, School, Star, CheckCircle
} from 'lucide-react';
import SightWordsLesson from './SightWordsLesson';
import AppUIWordsLesson from './AppUIWordsLesson';
import { PracticeBreadcrumb } from '@/components/PracticeBreadcrumb';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { textToSpeech } from '@/utils/tts';

// ============================================
// SUPABASE IMAGE HELPERS FOR STAGE 0
// ============================================

// Lesson 1: Alphabet Images (A-Z)
const SUPABASE_STAGE0_LESSON1_BASE = 'https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/lesson-1';
const getLetterImageUrl = (letter: string) => {
  const upper = (letter || '').toString().trim().charAt(0).toUpperCase();
  const safe = upper >= 'A' && upper <= 'Z' ? upper : 'A';
  return `${SUPABASE_STAGE0_LESSON1_BASE}/${safe}.png`;
};

// Lesson 2: Phonics/Minimal Pairs Images
const SUPABASE_STAGE0_LESSON2_BASE = 'https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/lesson-2';
const minimalPairKeyToFilename: Record<string, string> = {
  'b-v': 'B_Vs_V.png',
  'ch-sh': 'CH_Vs_SH.png',
  'd-t': 'D_Vs_T.png',
  'j-z': 'J_Vs_Z.png',
  'silent': 'K_Vs_B_Vs_L.png',
  't-th': 'T_Vs_Th.png',
  'p-f': 'P_Vs_F.png',
  's-z': 'S_Vs_Z.png',
  'k-g': 'K_Vs_G.png',
  'l-r': 'L_Vs_R.png',
};
const getMinimalPairImageUrl = (key: string) => {
  const filename = minimalPairKeyToFilename[key] || minimalPairKeyToFilename['b-v'];
  return `${SUPABASE_STAGE0_LESSON2_BASE}/${filename}`;
};

// Lesson 3: Vocabulary Images (Numbers, Days, Colors, Classroom Items)
const SUPABASE_STAGE0_LESSON3_BASE = 'https://otobfhnqafoyqinjenle.supabase.co/storage/v1/object/public/dil-lms-public/stage-0/lesson-3';
const getLesson3ImageUrl = (category: string, item: any): string => {
  let folder = '';
  if (category === 'Numbers') folder = 'numbers';
  else if (category === 'Days of the Week') folder = 'week';
  else if (category === 'Colors') folder = 'colors';
  else if (category === 'Classroom Items') folder = 'class-room-items';

  let filename = '';
  if (category === 'Numbers') filename = `${item.number}.png`;
  else filename = `${(item.word || '').toString().trim().replace(/\s+/g, '_')}.png`;

  return `${SUPABASE_STAGE0_LESSON3_BASE}/${folder}/${filename}`;
};

const alphabetSets = [
    [
        { letter: 'A', phonetic: '(ae-pl)', word: 'Apple', translation: 'سیب' },
        { letter: 'B', phonetic: '(buk)', word: 'Book', translation: 'کتاب' },
        { letter: 'C', phonetic: '(ket)', word: 'Cat', translation: 'بلی' },
        { letter: 'D', phonetic: '(dor)', word: 'Door', translation: 'دروازہ' },
        { letter: 'E', phonetic: '(e-le-fent)', word: 'Elephant', translation: 'ہاتھی' },
        { letter: 'F', phonetic: '(frend)', word: 'Friend', translation: 'دوست' },
    ],
    [
        { letter: 'G', phonetic: '(gaa-id)', word: 'Guide', translation: 'رہنما' },
        { letter: 'H', phonetic: '(haus)', word: 'House', translation: 'گھر' },
        { letter: 'I', phonetic: '(aais)', word: 'Ice', translation: 'برف' },
        { letter: 'J', phonetic: '(joos)', word: 'Juice', translation: 'رس' },
        { letter: 'K', phonetic: '(king)', word: 'King', translation: 'بادشاہ' },
        { letter: 'L', phonetic: '(lait)', word: 'Light', translation: 'روشنی' },
    ],
    [
        { letter: 'M', phonetic: '(moon)', word: 'Moon', translation: 'چاند' },
        { letter: 'N', phonetic: '(neim)', word: 'Name', translation: 'نام' },
        { letter: 'O', phonetic: '(or-inj)', word: 'Orange', translation: 'سنگتره' },
        { letter: 'P', phonetic: '(pen)', word: 'Pen', translation: 'قلم' },
        { letter: 'Q', phonetic: '(kween)', word: 'Queen', translation: 'ملکہ' },
        { letter: 'R', phonetic: '(rein)', word: 'Rain', translation: 'بارش' },
    ],
    [
        { letter: 'S', phonetic: '(san)', word: 'Sun', translation: 'سورج' },
        { letter: 'T', phonetic: '(tree)', word: 'Tree', translation: 'درخت' },
        { letter: 'U', phonetic: '(um-bre-la)', word: 'Umbrella', translation: 'چھتری' },
        { letter: 'V', phonetic: '(van)', word: 'Van', translation: 'وین' },
        { letter: 'W', phonetic: '(waa-ter)', word: 'Water', translation: 'پانی' },
        { letter: 'X', phonetic: '(eks-ray)', word: 'X-Ray', translation: 'ایکس رے' },
        { letter: 'Y', phonetic: '(ye-lo)', word: 'Yellow', translation: 'پیلا' },
        { letter: 'Z', phonetic: '(zee-bra)', word: 'Zebra', translation: 'زیبرا' },
    ]
];

const phonicsSets = [
    { icon: Volume2, key: 'b-v', title: 'B as in Ball vs. V as in Van', examples: ['Ball vs. Van', 'Bat vs. Vast', 'Boy vs. Voice'], urduExplanation: [{ sound: 'B', text: 'آواز لبوں کو بند کر کے ادا کی جاتی ہے' }, { sound: 'V', text: 'آواز دانتوں سے ہونٹ رگڑ کر ادا کی جاتی ہے' }] },
    { icon: Target, key: 't-th', title: 'T as in Time vs. TH as in Think', examples: ['Time vs. Think', 'Ten vs. Thank', 'Toy vs. Thirst'], urduExplanation: [{ sound: 'T', text: 'زبان کو دانتوں کے پیچھے رکھ کر بولتے ہیں' }, { sound: 'TH', text: 'میں زبان کو دانتوں کے بیچ رگڑ کر نرم آواز نکالی جاتی ہے' }] },
    { icon: Wind, key: 'p-f', title: 'P as in Pen vs. F as in Fan', examples: ['Pen vs. Fan', 'Pin vs. Fin', 'Pop vs. Fun'], urduExplanation: [{ sound: 'P', text: 'آواز ہونٹوں سے زوردار نکلتی ہے' }, { sound: 'F', text: 'آواز دانتوں اور ہونٹوں کے ہلکے رگڑ سے نکلتی ہے' }] },
    { icon: Dog, key: 'd-t', title: 'D as in Dog vs. T as in Top', examples: ['Dog vs. Top', 'Day vs. Toy', 'Dad vs. Tap'], urduExplanation: [{ sound: 'D', text: 'آواز نرم اور گہری ہوتی ہے' }, { sound: 'T', text: 'آواز سخت اور تیز ادا کی جاتی ہے' }] },
    { icon: Sun, key: 's-z', title: 'S as in Sun vs. Z as in Zoo', examples: ['Sun vs. Zoo', 'Sip vs. Zip', 'Sing vs. Zebra'], urduExplanation: [{ sound: 'S', text: 'آواز بغیر سانس سے آتی ہے' }, { sound: 'Z', text: 'آواز سانس اور آواز کے ساتھ ہوتی ہے، جیسے مکھی کی بھنبھناہٹ' }] },
    { icon: Crown, key: 'k-g', title: 'K as in King vs. G as in Goat', examples: ['King vs. Goat', 'Kit vs. Gift', 'Cold vs. Gold'], urduExplanation: [{ sound: 'K', text: 'آواز بغیر سانس کے ہوتی ہے، صرف سانس سے' }, { sound: 'G', text: 'آواز گلے سے آواز کے ساتھ نکلتی ہے' }] },
    { icon: Armchair, key: 'ch-sh', title: 'CH as in Chair vs. SH as in Ship', examples: ['Chair vs. Ship', 'Cheese vs. Sheet', 'Chat vs. Shine'], urduExplanation: [{ sound: 'CH', text: 'آواز \'چ\' جیسی ہوتی ہے' }, { sound: 'SH', text: 'آواز \'ش\' جیسی ہوتی ہے، زیادہ نرم اور لمبی' }] },
    { icon: GlassWater, key: 'j-z', title: 'J as in Jam vs. Z as in Zip', examples: ['Jam vs. Zip', 'Joke vs. Zone', 'Jump vs. Zebra'], urduExplanation: [{ sound: 'J', text: 'آواز \'ج\' جیسی ہوتی ہے' }, { sound: 'Z', text: 'آواز سانس اور آواز کے ساتھ نکلتی ہے، جیسے بھنبھناہٹ' }] },
    { icon: Cat, key: 'l-r', title: 'L as in Lion vs. R as in Rain', examples: ['Lion vs. Rain', 'Light vs. Right', 'Lock vs. Rock'], urduExplanation: [{ sound: 'L', text: 'آواز زبان کو دانتوں کے پیچھے لگا کر نکالی جاتی ہے' }, { sound: 'R', text: 'آواز زبان کو موڑ کر نکالی جاتی ہے، گول انداز میں' }] },
    { icon: SmilePlus, key: 'silent', title: 'Silent Letters (K, B, L)', examples: ['K in "Knife" is silent → "نائف"', 'B in "Lamb" is silent → "لیم"', 'L in "Half" is silent → "ہاف"'], urduExplanation: [{ sound: '', text: 'کچھ انگریزی الفاظ میں حروف نظر آتے ہیں مگر بولے نہیں جاتے' }, { sound: '', text: 'ان کو Silent Letters کہتے ہیں' }] },
];

const vocabularySets = [
    {
        icon: Hash,
        title: 'Numbers',
        wordsToLearn: 10,
        words: [
            { number: '1', phonetic: '(wun)', word: 'One', translation: 'ایک' },
            { number: '2', phonetic: '(too)', word: 'Two', translation: 'دو' },
            { number: '3', phonetic: '(three)', word: 'Three', translation: 'تین' },
            { number: '4', phonetic: '(for)', word: 'Four', translation: 'چار' },
            { number: '5', phonetic: '(fa-iv)', word: 'Five', translation: 'پانچ' },
            { number: '6', phonetic: '(siks)', word: 'Six', translation: 'چھ' },
            { number: '7', phonetic: '(sev-en)', word: 'Seven', translation: 'سات' },
            { number: '8', phonetic: '(eyt)', word: 'Eight', translation: 'آٹھ' },
            { number: '9', phonetic: '(na-in)', word: 'Nine', translation: 'نو' },
            { number: '10', phonetic: '(ten)', word: 'Ten', translation: 'دس' },
        ]
    },
    {
        icon: Calendar,
        title: 'Days of the Week',
        wordsToLearn: 7,
        words: [
            { word: 'Monday', phonetic: '(mun-day)', translation: 'پیر' },
            { word: 'Tuesday', phonetic: '(tuz-day)', translation: 'منگل' },
            { word: 'Wednesday', phonetic: '(wenz-day)', translation: 'بدھ' },
            { word: 'Thursday', phonetic: '(thurs-day)', translation: 'جمعرات' },
            { word: 'Friday', phonetic: '(fri-day)', translation: 'جمعہ' },
            { word: 'Saturday', phonetic: '(sat-ur-day)', translation: 'ہفتہ' },
            { word: 'Sunday', phonetic: '(sun-day)', translation: 'اتوار' },
        ]
    },
    {
        icon: Palette,
        title: 'Colors',
        wordsToLearn: 6,
        words: [
            { word: 'Red', phonetic: '(red)', translation: 'سرخ' },
            { word: 'Blue', phonetic: '(bloo)', translation: 'نیلا' },
            { word: 'Green', phonetic: '(green)', translation: 'سبز' },
            { word: 'Yellow', phonetic: '(yel-low)', translation: 'پیلا' },
            { word: 'Black', phonetic: '(blak)', translation: 'کالا' },
            { word: 'White', phonetic: '(wha-it)', translation: 'سفید' },
        ]
    },
    {
        icon: School,
        title: 'Classroom Items',
        wordsToLearn: 5,
        words: [
            { word: 'Book', phonetic: '(buk)', translation: 'کتاب' },
            { word: 'Pen', phonetic: '(pen)', translation: 'قلم' },
            { word: 'Chair', phonetic: '(chair)', translation: 'کرسی' },
            { word: 'Table', phonetic: '(tay-bul)', translation: 'میز' },
            { word: 'Bag', phonetic: '(bag)', translation: 'بیگ' },
        ]
    }
];


const AlphabetLesson = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
    const { playAudio, stopAudio } = useAudioPlayer();
    const progress = ((step + 1) / alphabetSets.length) * 100;

    // Function to play text-to-speech audio using /tts API
    const handlePlayAudio = async (word: string) => {
        if (loadingAudio) return; // Prevent multiple simultaneous plays
        
        setLoadingAudio(word);
        try {
            // Stop any currently playing audio
            stopAudio();
            
            // Call TTS API to get audio URL
            const audioUrl = await textToSpeech(word);
            
            // Play the audio using the audio player hook
            await playAudio(audioUrl);
            
            // Clean up loading state after audio starts playing
            setTimeout(() => {
                setLoadingAudio(null);
            }, 100);
        } catch (error) {
            console.error('Error playing audio:', error);
            setLoadingAudio(null);
        }
    };

    const handleNext = () => {
        if (step < alphabetSets.length - 1) setStep(step + 1);
        else navigate(-1);
    };

    return (
        <div className="w-full">
            <div className="relative flex items-center justify-center mb-4 sm:mb-6">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 w-10 h-10 sm:w-12 sm:h-12 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-center px-16 sm:px-0">
                    <div className="inline-block p-2.5 sm:p-3 bg-primary/20 rounded-full mb-1.5 sm:mb-2">
                        <BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold">The English Alphabet</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Master the ABCs with confidence</p>
                </div>
            </div>

            <div className="my-4 sm:my-6">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">{step + 1} of {alphabetSets.length}</p>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {alphabetSets[step].map((item, index) => (
                    <Card 
                        key={index} 
                        className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-2xl"
                    >
                        {/* Image Section */}
                        <div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                            <img 
                                src={getLetterImageUrl(item.letter)} 
                                alt={item.word}
                                className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                onError={(e) => {
                                    const target = e.target as HTMLImageElement;
                                    target.style.display = 'none';
                                }}
                            />
                            {/* Letter Badge */}
                            <div className="absolute top-3 left-3 bg-primary text-primary-foreground rounded-2xl w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg border-2 border-white/50">
                                {item.letter}
                            </div>
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
                                    {item.phonetic}
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

            <Button size="lg" className="w-full" onClick={handleNext}>
                <ChevronRight className="w-5 h-5 mr-2" />
                {step < alphabetSets.length - 1 ? 'Continue' : 'Finish Lesson'}
            </Button>
        </div>
    );
};

const PhonicsLesson = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
    const { playAudio, stopAudio } = useAudioPlayer();
    const progress = ((step + 1) / phonicsSets.length) * 100;

    // Function to play text-to-speech audio using /tts API
    const handlePlayAudio = async (word: string) => {
        if (loadingAudio) return; // Prevent multiple simultaneous plays
        
        setLoadingAudio(word);
        try {
            // Stop any currently playing audio
            stopAudio();
            
            // Call TTS API to get audio URL
            const audioUrl = await textToSpeech(word);
            
            // Play the audio using the audio player hook
            await playAudio(audioUrl);
            
            // Clean up loading state when audio ends
            setTimeout(() => {
                setLoadingAudio(null);
            }, 100);
        } catch (error) {
            console.error('Error playing audio:', error);
            setLoadingAudio(null);
        }
    };

    const handleNext = () => {
        if (step < phonicsSets.length - 1) setStep(step + 1);
        else navigate(-1);
    };
    
    const currentSet = phonicsSets[step];

    return (
        <div className="w-full">
            <div className="relative flex items-center justify-center mb-4 sm:mb-6">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 w-10 h-10 sm:w-12 sm:h-12 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-center px-16 sm:px-0">
                    <div className="inline-block p-2.5 sm:p-3 bg-primary/20 rounded-full mb-1.5 sm:mb-2"><Music className="h-7 w-7 sm:h-8 sm:w-8 text-primary" /></div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Phonics & Sound Confusion</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Master tricky sound differences</p>
                </div>
            </div>
            <div className="my-4 sm:my-6">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">{step + 1} of {phonicsSets.length}</p>
            </div>
            <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
                {/* Main Image Card */}
                <Card className="group overflow-hidden transition-all duration-500 hover:shadow-2xl border-0 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-2xl">
                    {/* Image Section */}
                    <div className="relative h-64 sm:h-80 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <img 
                            src={getMinimalPairImageUrl(currentSet.key)} 
                            alt={currentSet.title}
                            className="w-full h-full object-contain p-4 transition-transform duration-700 group-hover:scale-105"
                            onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                            }}
                        />
                        {/* Icon Badge */}
                        <div className="absolute top-4 left-4 bg-gradient-to-br from-primary to-primary/90 text-white rounded-2xl w-14 h-14 sm:w-16 sm:h-16 flex items-center justify-center shadow-xl border-2 border-white/50">
                            <currentSet.icon className="w-7 h-7 sm:w-8 sm:h-8" />
                        </div>
                        {/* Play Button */}
                        <div className="absolute bottom-4 right-4">
                            <Button 
                                size="icon" 
                                className={`w-14 h-14 sm:w-16 sm:h-16 rounded-full shadow-xl border-2 border-white/50 transition-all duration-300 ${
                                    loadingAudio === currentSet.title 
                                        ? 'bg-primary/70 cursor-not-allowed scale-95' 
                                        : 'bg-primary hover:bg-primary/90 hover:scale-110'
                                }`}
                                onClick={() => handlePlayAudio(currentSet.title)}
                                disabled={loadingAudio === currentSet.title}
                            >
                                {loadingAudio === currentSet.title ? (
                                    <div className="w-7 h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <Play className="w-7 h-7 text-white" fill="white" />
                                )}
                            </Button>
                        </div>
                    </div>
                    
                    {/* Title Section */}
                    <CardContent className="p-5 sm:p-6">
                        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 text-center leading-tight">
                            {currentSet.title}
                        </h2>
                    </CardContent>
                </Card>

                {/* Examples Card */}
                <Card className="overflow-hidden border-0 bg-gradient-to-br from-green-50 to-green-100/50 dark:from-green-900/20 dark:to-green-900/10 rounded-2xl shadow-lg">
                    <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-primary/20 to-primary/30 rounded-xl shadow-sm">
                                <Pencil className="w-5 h-5 sm:w-6 sm:h-6 text-primary"/>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Examples</h3>
                        </div>
                        <div className="space-y-3">
                            {currentSet.examples.map((ex, i) => (
                                <div key={i} className="flex items-center gap-3 p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-800/60">
                                    <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>
                                    <span className="text-sm sm:text-base text-gray-700 dark:text-gray-300 font-medium">{ex}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Urdu Explanation Card */}
                <Card className="overflow-hidden border-0 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-900/10 rounded-2xl shadow-lg">
                    <CardContent className="p-5 sm:p-6 space-y-4">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 sm:p-3 bg-gradient-to-br from-amber-500/20 to-amber-600/30 rounded-xl shadow-sm">
                                <BookOpen className="w-5 h-5 sm:w-6 sm:h-6 text-amber-600 dark:text-amber-500"/>
                            </div>
                            <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100">Urdu Explanation</h3>
                        </div>
                        <div className="space-y-3 font-urdu">
                            {currentSet.urduExplanation.map((ex, i) => (
                                <div key={i} className="flex items-start gap-3 p-3 bg-white/60 dark:bg-gray-800/40 rounded-xl transition-all duration-300 hover:bg-white/80 dark:hover:bg-gray-800/60">
                                    <div className="w-2 h-2 bg-amber-600 dark:bg-amber-500 rounded-full flex-shrink-0 mt-2.5"></div>
                                    <span className="text-base sm:text-lg text-gray-700 dark:text-gray-300 leading-relaxed">
                                        {ex.sound && <span className="font-bold text-amber-700 dark:text-amber-400">{ex.sound} - </span>}
                                        {ex.text}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
            <Button size="lg" className="w-full" onClick={handleNext}>
                <ChevronRight className="w-5 h-5 mr-2" />
                {step < phonicsSets.length - 1 ? 'Continue' : 'Finish Lesson'}
            </Button>
        </div>
    );
};

const VocabularyLesson = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
    const { playAudio, stopAudio } = useAudioPlayer();
    const progress = ((step + 1) / vocabularySets.length) * 100;
    const isCompletion = step === vocabularySets.length;

    // Function to play text-to-speech audio using /tts API
    const handlePlayAudio = async (word: string) => {
        if (loadingAudio) return; // Prevent multiple simultaneous plays
        
        setLoadingAudio(word);
        try {
            // Stop any currently playing audio
            stopAudio();
            
            // Call TTS API to get audio URL
            const audioUrl = await textToSpeech(word);
            
            // Play the audio using the audio player hook
            await playAudio(audioUrl);
            
            // Clean up loading state after audio starts playing
            setTimeout(() => {
                setLoadingAudio(null);
            }, 100);
        } catch (error) {
            console.error('Error playing audio:', error);
            setLoadingAudio(null);
        }
    };

    const handleNext = () => {
        if (step < vocabularySets.length) setStep(step + 1);
        else navigate(-1);
    };

    const currentSet = vocabularySets[step];
    
    if (isCompletion) {
        return (
            <div className="w-full text-center">
                 <div className="inline-block p-3 bg-primary/20 rounded-full mb-4">
                    <Star className="h-10 w-10 text-primary" />
                </div>
                <h1 className="text-3xl font-bold">Amazing Progress!</h1>
                <p className="text-muted-foreground mb-8">You've learned essential vocabulary</p>
                <div className="grid grid-cols-3 gap-4 mb-8">
                    <Card><CardContent className="p-4"><p className="text-2xl font-bold">28</p><p className="text-sm text-muted-foreground">Words Learned</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-2xl font-bold">4</p><p className="text-sm text-muted-foreground">Categories</p></CardContent></Card>
                    <Card><CardContent className="p-4"><p className="text-2xl font-bold text-green-500">100%</p><p className="text-sm text-muted-foreground">Completion</p></CardContent></Card>
                </div>
                <h2 className="text-xl font-bold mb-4">What You've Mastered:</h2>
                <div className="space-y-3 text-left">
                    {vocabularySets.map(s => <Card key={s.title} className="p-4 flex items-center gap-4"><s.icon className="h-6 w-6 text-primary"/>{s.title}</Card>)}
                </div>
                 <Button size="lg" className="w-full mt-8" onClick={handleNext}>
                    <CheckCircle className="w-5 h-5 mr-2" />
                    Complete Lesson
                </Button>
            </div>
        )
    }

    return (
         <div className="w-full">
            <div className="relative flex items-center justify-center mb-4 sm:mb-6">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 w-10 h-10 sm:w-12 sm:h-12 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-md hover:shadow-primary/10 hover:bg-primary/5 hover:border-primary/30 hover:text-primary" 
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-center px-16 sm:px-0">
                    <div className="inline-block p-2.5 sm:p-3 bg-primary/20 rounded-full mb-1.5 sm:mb-2"><BookOpen className="h-7 w-7 sm:h-8 sm:w-8 text-primary" /></div>
                    <h1 className="text-2xl sm:text-3xl font-bold">Vocabulary Basics</h1>
                    <p className="text-muted-foreground text-sm sm:text-base">Essential words for everyday use</p>
                </div>
            </div>
            <div className="my-4 sm:my-6">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-xs sm:text-sm text-muted-foreground mt-2">{step + 1} of {vocabularySets.length}</p>
            </div>
            <div className="space-y-6 sm:space-y-8 mb-6 sm:mb-8">
                {/* Category Header Card */}
                <Card className="overflow-hidden border-0 bg-gradient-to-br from-primary/5 to-primary/10 rounded-2xl shadow-lg">
                    <CardContent className="p-5 sm:p-6 flex items-center gap-4">
                        <div className="p-3 sm:p-4 bg-gradient-to-br from-primary/20 to-primary/30 rounded-2xl shadow-md">
                            <currentSet.icon className="w-7 h-7 sm:w-8 sm:h-8 text-primary"/>
                        </div>
                        <div className="flex-1">
                            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-gray-100 leading-tight">{currentSet.title}</h2>
                            <p className="text-sm sm:text-base text-muted-foreground mt-1">{currentSet.wordsToLearn} words to learn</p>
                        </div>
                    </CardContent>
                </Card>

                {/* Words Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
                    {currentSet.words.map((item, index) => {
                        const wordToPlay = item.word || item.number || '';
                        return (
                            <Card 
                                key={index} 
                                className="group overflow-hidden transition-all duration-500 hover:scale-[1.02] hover:shadow-2xl border-0 bg-gradient-to-br from-card to-card/50 dark:bg-card rounded-2xl"
                            >
                                {/* Image Section */}
                                <div className="relative h-48 sm:h-56 bg-gradient-to-br from-primary/5 to-primary/10 overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                                    <img 
                                        src={getLesson3ImageUrl(currentSet.title, item)} 
                                        alt={wordToPlay}
                                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.style.display = 'none';
                                        }}
                                    />
                                    {/* Number/Word Badge (for Numbers category) */}
                                    {item.number && (
                                        <div className="absolute top-3 left-3 bg-primary text-primary-foreground rounded-2xl min-w-12 h-12 sm:min-w-14 sm:h-14 px-3 flex items-center justify-center text-2xl sm:text-3xl font-bold shadow-lg border-2 border-white/50">
                                            {item.number}
                                        </div>
                                    )}
                                    {/* Play Button Overlay */}
                                    <div className="absolute bottom-3 right-3">
                                        <Button 
                                            size="icon" 
                                            className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full shadow-xl border-2 border-white/50 transition-all duration-300 ${
                                                loadingAudio === wordToPlay 
                                                    ? 'bg-primary/70 cursor-not-allowed scale-95' 
                                                    : 'bg-primary hover:bg-primary/90 hover:scale-110'
                                            }`}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handlePlayAudio(wordToPlay);
                                            }}
                                            disabled={loadingAudio === wordToPlay}
                                        >
                                            {loadingAudio === wordToPlay ? (
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
                                            {item.phonetic}
                                        </span>
                                    </div>
                                    <div className="space-y-1.5">
                                        <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 leading-tight">
                                            {item.word || item.number}
                                        </h3>
                                        <p className="font-urdu text-base sm:text-lg text-muted-foreground leading-relaxed">
                                            {item.translation}
                                        </p>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            </div>
            <Button size="lg" className="w-full" onClick={handleNext}>
                <ChevronRight className="w-5 h-5 mr-2" />
                Continue
            </Button>
        </div>
    )
}

export const LessonDetail: React.FC = () => {
    const { lessonId } = useParams<{ lessonId?: string }>();

    return (
        <div className="p-4 sm:p-6 lg:p-8">
            <PracticeBreadcrumb className="mb-6" />
            <div className="max-w-4xl mx-auto flex items-center justify-center">
                {lessonId === '1' && <AlphabetLesson />}
                {lessonId === '2' && <PhonicsLesson />}
                {lessonId === '3' && <VocabularyLesson />}
                {lessonId === '4' && <SightWordsLesson />}
                {lessonId === '5' && <AppUIWordsLesson />}
            </div>
        </div>
    );
}; 