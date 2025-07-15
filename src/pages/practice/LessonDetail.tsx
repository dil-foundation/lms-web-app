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

const alphabetSets = [
    [
        { letter: 'A', phonetic: '(ae-pl)', word: 'Apple', translation: 'سیب' },
        { letter: 'B', phonetic: '(buk)', word: 'Book', translation: 'کتاب' },
        { letter: 'C', phonetic: '(ket)', word: 'Cat', translation: 'بلی' },
        { letter: 'D', phonetic: '(dog)', word: 'Dog', translation: 'کتا' },
        { letter: 'E', phonetic: '(el-e-fent)', word: 'Elephant', translation: 'ہاتھی' },
        { letter: 'F', phonetic: '(fish)', word: 'Fish', translation: 'مچھلی' },
    ],
    [
        { letter: 'G', phonetic: '(gōt)', word: 'Goat', translation: 'بکری' },
        { letter: 'H', phonetic: '(hat)', word: 'Hat', translation: 'ٹوپی' },
        { letter: 'I', phonetic: '(īs-krēm)', word: 'Ice cream', translation: 'آئس کریم' },
        { letter: 'J', phonetic: '(jug)', word: 'Jug', translation: 'جگ' },
        { letter: 'K', phonetic: '(kīt)', word: 'Kite', translation: 'پتنگ' },
        { letter: 'L', phonetic: '(lī-ən)', word: 'Lion', translation: 'شیر' },
    ],
    [
        { letter: 'M', phonetic: '(mung-kē)', word: 'Monkey', translation: 'بندر' },
        { letter: 'N', phonetic: '(nest)', word: 'Nest', translation: 'گھونسلہ' },
        { letter: 'O', phonetic: '(ok-tə-pəs)', word: 'Octopus', translation: 'آکٹوپس' },
        { letter: 'P', phonetic: '(pen-gwin)', word: 'Penguin', translation: 'پینگوئن' },
        { letter: 'Q', phonetic: '(kwēn)', word: 'Queen', translation: 'ملکہ' },
        { letter: 'R', phonetic: '(rab-it)', word: 'Rabbit', translation: 'خرگوش' },
    ],
    [
        { letter: 'S', phonetic: '(sun)', word: 'Sun', translation: 'سورج' },
        { letter: 'T', phonetic: '(tī-gər)', word: 'Tiger', translation: 'شیر' },
        { letter: 'U', phonetic: '(um-brel-ə)', word: 'Umbrella', translation: 'چھتری' },
        { letter: 'V', phonetic: '(vān)', word: 'Van', translation: 'وین' },
        { letter: 'W', phonetic: '(wotch)', word: 'Watch', translation: 'گھڑی' },
        { letter: 'X', phonetic: '(zī-lə-fōn)', word: 'Xylophone', translation: 'زائلفون' },
        { letter: 'Y', phonetic: '(yō-yō)', word: 'Yo-yo', translation: 'یویو' },
        { letter: 'Z', phonetic: '(zē-brə)', word: 'Zebra', translation: 'زیبرا' },
    ]
];

const phonicsSets = [
    { icon: Volume2, title: 'B as in Ball vs. V as in Van', examples: ['Ball vs. Van', 'Bat vs. Vast', 'Boy vs. Voice'], urduExplanation: [{ sound: 'B', text: 'آواز لبوں کو بند کر کے ادا کی جاتی ہے' }, { sound: 'V', text: 'آواز دانتوں سے ہونٹ رگڑ کر ادا کی جاتی ہے' }] },
    { icon: Target, title: 'T as in Time vs. TH as in Think', examples: ['Time vs. Think', 'Ten vs. Thank', 'Toy vs. Thirst'], urduExplanation: [{ sound: 'T', text: 'زبان کو دانتوں کے پیچھے رکھ کر بولتے ہیں' }, { sound: 'TH', text: 'میں زبان کو دانتوں کے بیچ رگڑ کر نرم آواز نکالی جاتی ہے' }] },
    { icon: Wind, title: 'P as in Pen vs. F as in Fan', examples: ['Pen vs. Fan', 'Pin vs. Fin', 'Pop vs. Fun'], urduExplanation: [{ sound: 'P', text: 'آواز ہونٹوں سے زوردار نکلتی ہے' }, { sound: 'F', text: 'آواز دانتوں اور ہونٹوں کے ہلکے رگڑ سے نکلتی ہے' }] },
    { icon: Dog, title: 'D as in Dog vs. T as in Top', examples: ['Dog vs. Top', 'Day vs. Toy', 'Dad vs. Tap'], urduExplanation: [{ sound: 'D', text: 'آواز نرم اور گہری ہوتی ہے' }, { sound: 'T', text: 'آواز سخت اور تیز ادا کی جاتی ہے' }] },
    { icon: Sun, title: 'S as in Sun vs. Z as in Zoo', examples: ['Sun vs. Zoo', 'Sip vs. Zip', 'Sing vs. Zebra'], urduExplanation: [{ sound: 'S', text: 'آواز بغیر سانس سے آتی ہے' }, { sound: 'Z', text: 'آواز سانس اور آواز کے ساتھ ہوتی ہے، جیسے مکھی کی بھنبھناہٹ' }] },
    { icon: Crown, title: 'K as in King vs. G as in Goat', examples: ['King vs. Goat', 'Kit vs. Gift', 'Cold vs. Gold'], urduExplanation: [{ sound: 'K', text: 'آواز بغیر سانس کے ہوتی ہے، صرف سانس سے' }, { sound: 'G', text: 'آواز گلے سے آواز کے ساتھ نکلتی ہے' }] },
    { icon: Armchair, title: 'CH as in Chair vs. SH as in Ship', examples: ['Chair vs. Ship', 'Cheese vs. Sheet', 'Chat vs. Shine'], urduExplanation: [{ sound: 'CH', text: 'آواز \'چ\' جیسی ہوتی ہے' }, { sound: 'SH', text: 'آواز \'ش\' جیسی ہوتی ہے، زیادہ نرم اور لمبی' }] },
    { icon: GlassWater, title: 'J as in Jam vs. Z as in Zip', examples: ['Jam vs. Zip', 'Joke vs. Zone', 'Jump vs. Zebra'], urduExplanation: [{ sound: 'J', text: 'آواز \'ج\' جیسی ہوتی ہے' }, { sound: 'Z', text: 'آواز سانس اور آواز کے ساتھ نکلتی ہے، جیسے بھنبھناہٹ' }] },
    { icon: Cat, title: 'L as in Lion vs. R as in Rain', examples: ['Lion vs. Rain', 'Light vs. Right', 'Lock vs. Rock'], urduExplanation: [{ sound: 'L', text: 'آواز زبان کو دانتوں کے پیچھے لگا کر نکالی جاتی ہے' }, { sound: 'R', text: 'آواز زبان کو موڑ کر نکالی جاتی ہے، گول انداز میں' }] },
    { icon: SmilePlus, title: 'Silent Letters (K, B, L)', examples: ['K in "Knife" is silent → "نائف"', 'B in "Lamb" is silent → "لیم"', 'L in "Half" is silent → "ہاف"'], urduExplanation: [{ sound: '', text: 'کچھ انگریزی الفاظ میں حروف نظر آتے ہیں مگر بولے نہیں جاتے' }, { sound: '', text: 'ان کو Silent Letters کہتے ہیں' }] },
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
        ]
    }
];


const AlphabetLesson = () => {
    const navigate = useNavigate();
    const [step, setStep] = useState(0);
    const progress = ((step + 1) / alphabetSets.length) * 100;

    const handleNext = () => {
        if (step < alphabetSets.length - 1) setStep(step + 1);
        else navigate(-1);
    };

    return (
        <div className="w-full">
            <div className="relative flex items-center justify-center mb-6">
                <Button variant="outline" size="icon" className="absolute left-0" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-4 w-4" />
                </Button>
                <div className="text-center">
                    <div className="inline-block p-3 bg-primary/20 rounded-full mb-2">
                        <BookOpen className="h-8 w-8 text-primary" />
                    </div>
                    <h1 className="text-3xl font-bold">The English Alphabet</h1>
                    <p className="text-muted-foreground">Master the ABCs with confidence</p>
                </div>
            </div>

            <div className="my-6">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">{step + 1} of {alphabetSets.length}</p>
            </div>
            
            <div className="space-y-4 mb-8">
                {alphabetSets[step].map((item, index) => (
                    <Card key={index} className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 flex items-center">
                        <div className="flex items-center gap-4 flex-1">
                            <div className="bg-primary text-primary-foreground rounded-full w-12 h-12 flex items-center justify-center text-2xl font-bold">{item.letter}</div>
                            <span className="text-muted-foreground">{item.phonetic}</span>
                        </div>
                        <div className="flex-1 text-left sm:text-center">
                            <h3 className="text-2xl font-bold">{item.word}</h3>
                            <p className="font-urdu text-muted-foreground text-lg">{item.translation}</p>
                        </div>
                        <div className="flex-1 flex justify-end">
                            <Button size="icon" className="w-14 h-14 rounded-full bg-primary/80 hover:bg-primary"><Play className="w-6 h-6" /></Button>
                        </div>
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
    const progress = ((step + 1) / phonicsSets.length) * 100;

    const handleNext = () => {
        if (step < phonicsSets.length - 1) setStep(step + 1);
        else navigate(-1);
    };
    
    const currentSet = phonicsSets[step];

    return (
        <div className="w-full">
            <div className="relative flex items-center justify-center mb-6">
                <Button variant="outline" size="icon" className="absolute left-0" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                <div className="text-center">
                    <div className="inline-block p-3 bg-primary/20 rounded-full mb-2"><Music className="h-8 w-8 text-primary" /></div>
                    <h1 className="text-3xl font-bold">Phonics & Sound Confusion</h1>
                    <p className="text-muted-foreground">Master tricky sound differences</p>
                </div>
            </div>
            <div className="my-6">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">{step + 1} of {phonicsSets.length}</p>
            </div>
            <div className="space-y-6 mb-8">
                <Card className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 flex items-center">
                    <div className="flex items-center gap-4 flex-1">
                        <div className="bg-primary/10 text-primary-foreground rounded-full w-16 h-16 flex items-center justify-center"><currentSet.icon className="w-8 h-8 text-primary" /></div>
                        <h2 className="text-2xl font-bold">{currentSet.title}</h2>
                    </div>
                    <Button size="icon" className="w-14 h-14 rounded-full bg-primary/80 hover:bg-primary"><Play className="w-6 h-6" /></Button>
                </Card>
                <Card className="p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                    <div className="flex items-center mb-4">
                        <div className="p-2 bg-primary/20 rounded-full mr-3"><Pencil className="w-5 h-5 text-primary"/></div>
                        <h3 className="text-xl font-bold">Examples:</h3>
                    </div>
                    <ul className="space-y-2 pl-6">{currentSet.examples.map((ex, i) => (<li key={i} className="flex items-center"><div className="w-2 h-2 bg-primary rounded-full mr-3"></div>{ex}</li>))}</ul>
                </Card>
                <Card className="p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
                    <div className="flex items-center mb-4">
                        <div className="p-2 bg-red-500/20 rounded-full mr-3"><BookOpen className="w-5 h-5 text-red-500"/></div>
                        <h3 className="text-xl font-bold">Urdu Explanation:</h3>
                    </div>
                    <ul className="space-y-2 pl-6 font-urdu text-lg">{currentSet.urduExplanation.map((ex, i) => (<li key={i} className="flex items-start"><div className="w-2 h-2 bg-red-500 rounded-full mr-3 mt-3"></div><span>{ex.sound && <span className="font-bold">{ex.sound} - </span>}{ex.text}</span></li>))}</ul>
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
    const progress = ((step + 1) / vocabularySets.length) * 100;
    const isCompletion = step === vocabularySets.length;

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
            <div className="relative flex items-center justify-center mb-6">
                <Button variant="outline" size="icon" className="absolute left-0" onClick={() => navigate(-1)}><ArrowLeft className="h-4 w-4" /></Button>
                <div className="text-center">
                    <div className="inline-block p-3 bg-primary/20 rounded-full mb-2"><BookOpen className="h-8 w-8 text-primary" /></div>
                    <h1 className="text-3xl font-bold">Vocabulary Basics</h1>
                    <p className="text-muted-foreground">Essential words for everyday use</p>
                </div>
            </div>
            <div className="my-6">
                <Progress value={progress} className="h-2" />
                <p className="text-center text-sm text-muted-foreground mt-2">{step + 1} of {vocabularySets.length}</p>
            </div>
            <div className="space-y-4 mb-8">
                <Card className="p-4 sm:p-6 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 flex items-center">
                    <div className="p-3 bg-primary/10 rounded-full mr-4"><currentSet.icon className="w-8 h-8 text-primary" /></div>
                    <div>
                        <h2 className="text-2xl font-bold">{currentSet.title}</h2>
                        <p className="text-muted-foreground">{currentSet.wordsToLearn} words to learn</p>
                    </div>
                </Card>
                {currentSet.words.map((item, index) => (
                    <Card key={index} className="p-4 flex items-center">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold flex items-center gap-3">
                                {item.number || item.word}
                                <span className="text-lg text-muted-foreground font-normal">{item.phonetic}</span>
                            </h3>
                            <p className="font-urdu text-muted-foreground text-xl">{item.translation}</p>
                        </div>
                        <Button size="icon" className="w-14 h-14 rounded-full bg-primary/80 hover:bg-primary"><Play className="w-6 h-6" /></Button>
                    </Card>
                ))}
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
        <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto flex items-center justify-center">
            {lessonId === '1' && <AlphabetLesson />}
            {lessonId === '2' && <PhonicsLesson />}
            {lessonId === '3' && <VocabularyLesson />}
            {lessonId === '4' && <SightWordsLesson />}
            {lessonId === '5' && <AppUIWordsLesson />}
        </div>
    );
}; 