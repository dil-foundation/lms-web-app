
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    ArrowLeft, Smartphone, Play, ArrowRight, CheckCircle, Mic, Volume2, Flag, PartyPopper, LucideIcon
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';

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

    return (
        <div className="w-full max-w-2xl mx-auto">
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
                    <Card key={index} className="p-4 flex items-center">
                        <div className="flex-1">
                            <h3 className="text-2xl font-bold">
                                {item.word}
                            </h3>
                            <p className="font-urdu text-muted-foreground text-xl">{item.translation}</p>
                        </div>
                        <Button 
                            size="icon" 
                            className={`w-14 h-14 rounded-full ${
                                loadingAudio === item.word 
                                    ? 'bg-primary/60 cursor-not-allowed' 
                                    : 'bg-primary/80 hover:bg-primary'
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