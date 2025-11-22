
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
    ArrowLeft, Smartphone, Play, ArrowRight, CheckCircle, Mic, Volume2, Flag, PartyPopper, LucideIcon
} from 'lucide-react';
import { useAudioPlayer } from '@/hooks/useAudioPlayer';
import { textToSpeech } from '@/utils/tts';

// --- Type Definitions ---
interface AppWord {
    word: string;
    translation: string;
    icon: LucideIcon;
    color: string;
}

// --- Lesson Data ---
const appUIWords: AppWord[] = [
    { word: "Start", translation: "شروع کریں", icon: Play, color: "from-primary to-primary/90" },
    { word: "Next", translation: "اگلا", icon: ArrowRight, color: "from-secondary to-secondary/90" },
    { word: "Submit", translation: "جمع کرائیں", icon: CheckCircle, color: "from-primary to-primary/90" },
    { word: "Speak", translation: "بولیں", icon: Mic, color: "from-secondary to-secondary/90" },
    { word: "Listen", translation: "سنیں", icon: Volume2, color: "from-primary to-primary/90" },
    { word: "Finish", translation: "ختم کریں", icon: Flag, color: "from-secondary to-secondary/90" },
];

const AppUIWordsLesson = () => {
    const navigate = useNavigate();
    const [loadingAudio, setLoadingAudio] = useState<string | null>(null);
    const { playAudio, stopAudio } = useAudioPlayer();

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

    return (
        <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
            {/* Enhanced Header with Apple-style aesthetics */}
            <div className="relative flex items-center justify-center mb-6 sm:mb-8 text-center">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 group w-10 h-10 sm:w-12 sm:h-12 rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
                </Button>
                
                <div className="space-y-2 sm:space-y-3 px-16 sm:px-0">
                    <div className="inline-block p-3 sm:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-2xl shadow-lg">
                        <Smartphone className="h-8 w-8 sm:h-10 sm:w-10 text-primary" />
                    </div>
                    <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Lesson 5: App UI Words
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg">Master app navigation vocabulary with confidence</p>
                </div>
            </div>

            {/* Enhanced Intro Card with Apple-style aesthetics */}
            <Card className="p-6 sm:p-8 mb-6 sm:mb-8 text-center bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-2 border-primary/20 rounded-2xl shadow-xl sm:hover:shadow-2xl transition-all duration-500 sm:hover:-translate-y-1 overflow-hidden">
                <div className="inline-block p-4 sm:p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-2xl shadow-lg mb-3 sm:mb-4">
                    <Smartphone className="h-10 w-10 sm:h-12 sm:w-12 text-primary" />
                </div>
                <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                    App Navigation Words
                </h2>
                <p className="text-muted-foreground text-base sm:text-lg leading-relaxed max-w-2xl mx-auto">
                    Master the English words you'll encounter in app buttons and menus. Each word includes pronunciation and Urdu translation for better understanding.
                </p>
            </Card>

            {/* Enhanced Words List with Apple-style aesthetics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
                {appUIWords.map((item, index) => (
                    <Card 
                        key={index} 
                        className="group p-5 sm:p-6 flex items-center bg-gradient-to-br from-card to-card/50 dark:bg-card border-2 border-gray-200/50 dark:border-gray-700/50 rounded-2xl shadow-lg sm:hover:shadow-2xl transition-all duration-500 sm:hover:-translate-y-2 sm:hover:scale-[1.02] overflow-hidden"
                    >
                        <div className="flex-1 space-y-2 sm:space-y-3">
                            <div className="flex items-center space-x-2 sm:space-x-3">
                                <div className={`p-2.5 sm:p-3 bg-gradient-to-br ${item.color} rounded-xl shadow-md`}>
                                    <item.icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                                </div>
                                <h3 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {item.word}
                                </h3>
                            </div>
                            <p className="font-urdu text-muted-foreground text-lg sm:text-xl leading-relaxed">
                                {item.translation}
                            </p>
                        </div>
                        
                        <Button 
                            size="icon" 
                            className={`w-14 h-14 sm:w-16 sm:h-16 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 ${
                                loadingAudio === item.word 
                                    ? 'bg-primary/60 cursor-not-allowed' 
                                    : 'bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                            }`}
                            onClick={() => handlePlayAudio(item.word)}
                            disabled={loadingAudio === item.word}
                        >
                            {loadingAudio === item.word ? (
                                <div className="w-6 h-6 sm:w-7 sm:h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-6 h-6 sm:w-7 sm:h-7" />
                            )}
                        </Button>
                    </Card>
                ))}
            </div>
            
            {/* Enhanced Completion Button with Apple-style aesthetics */}
            <Card className="p-5 sm:p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-2 border-primary/20 rounded-2xl shadow-xl overflow-hidden">
                <Button 
                    size="lg" 
                    className="w-full h-16 sm:h-20 text-lg sm:text-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-xl sm:hover:shadow-2xl transition-all duration-300 sm:hover:-translate-y-1 sm:hover:scale-[1.02] rounded-2xl" 
                    onClick={() => navigate(-1)}
                >
                    <div className="flex items-center justify-center space-x-4">
                        <div className="p-2.5 sm:p-3 bg-white/20 rounded-2xl">
                            <PartyPopper className="w-6 h-6 sm:w-8 sm:h-8" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-base sm:text-lg">Complete Lesson</p>
                            <p className="text-xs sm:text-sm font-normal opacity-90">Excellent! You've mastered app navigation vocabulary!</p>
                        </div>
                    </div>
                </Button>
            </Card>
        </div>
    );
};

export default AppUIWordsLesson; 