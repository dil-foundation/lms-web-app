
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    ArrowLeft, Smartphone, Play, ArrowRight, CheckCircle, Mic, Volume2, Flag, PartyPopper, LucideIcon
} from 'lucide-react';

// --- Type Definitions ---
interface AppWord {
    word: string;
    translation: string;
    icon: LucideIcon;
    color: string;
}

// --- Lesson Data ---
const appUIWords: AppWord[] = [
    { word: "Start", translation: "شروع کریں", icon: Play, color: "from-green-400 to-teal-500" },
    { word: "Next", translation: "اگلا", icon: ArrowRight, color: "from-red-400 to-orange-500" },
    { word: "Submit", translation: "جمع کرائیں", icon: CheckCircle, color: "from-blue-400 to-indigo-500" },
    { word: "Speak", translation: "بولیں", icon: Mic, color: "from-orange-400 to-pink-500" },
    { word: "Listen", translation: "سنیں", icon: Volume2, color: "from-purple-400 to-yellow-500" },
    { word: "Finish", translation: "ختم کریں", icon: Flag, color: "from-yellow-400 to-green-500" },
];

const AppUIWordsLesson = () => {
    const navigate = useNavigate();

    return (
        <div className="w-full max-w-md mx-auto">
            {/* Header */}
            <div className="relative flex items-center justify-center mb-6 text-center">
                 <Button variant="ghost" size="icon" className="absolute left-0" onClick={() => navigate(-1)}>
                    <ArrowLeft className="h-6 w-6" />
                </Button>
                <div>
                    <div className="inline-block p-3 bg-green-100 dark:bg-green-900/20 rounded-full mb-2">
                        <Smartphone className="h-8 w-8 text-green-500" />
                    </div>
                    <h1 className="text-2xl font-bold">Lesson 5: App UI Words</h1>
                    <p className="text-muted-foreground">Master app navigation vocabulary</p>
                </div>
            </div>

            {/* Intro Card */}
            <Card className="p-6 mb-8 text-center bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
                <div className="inline-block p-4 bg-white dark:bg-green-800/50 rounded-full mb-3">
                     <Smartphone className="h-10 w-10 text-green-500" />
                </div>
                <h2 className="text-2xl font-bold">App Navigation Words</h2>
                <p className="text-muted-foreground">Master the English words you'll encounter in app buttons and menus</p>
            </Card>

            {/* Words List */}
            <div className="space-y-4 mb-8">
                {appUIWords.map((item, index) => (
                    <Card key={index} className="p-4 flex items-center bg-white dark:bg-gray-800 shadow-lg rounded-2xl">
                        <Button className={`h-12 w-32 text-lg font-bold text-white bg-gradient-to-br ${item.color} shadow-md`}>
                            {item.word}
                        </Button>
                        <p className="font-urdu text-muted-foreground text-xl flex-1 text-center">{item.translation}</p>
                        <Button size="icon" variant="ghost" className="w-14 h-14 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 mr-2">
                           <item.icon className="w-6 h-6" />
                        </Button>
                        <Button size="icon" className="w-14 h-14 rounded-full bg-green-500/90 hover:bg-green-500 text-white">
                            <Play className="w-7 h-7" />
                        </Button>
                    </Card>
                ))}
            </div>
            
            {/* Completion Button */}
            <Button size="lg" className="w-full h-16 text-xl bg-green-500 hover:bg-green-600 text-white" onClick={() => navigate(-1)}>
                <div className="flex items-center justify-center">
                    <div className="p-2 bg-white/30 rounded-full mr-3">
                        <PartyPopper className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="font-bold">Complete Lesson</p>
                        <p className="text-sm font-normal">Excellent! You've mastered app navigation!</p>
                    </div>
                </div>
            </Button>
        </div>
    );
};

export default AppUIWordsLesson; 