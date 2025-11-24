
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
        <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 md:py-8">
            {/* Enhanced Header with Apple-style aesthetics */}
            <div className="relative flex items-center justify-center mb-4 sm:mb-6 md:mb-8 text-center">
                <Button 
                    variant="outline" 
                    size="icon" 
                    className="absolute left-0 top-1/2 -translate-y-1/2 group w-9 h-9 sm:w-10 sm:h-10 md:w-12 md:h-12 rounded-xl sm:rounded-2xl border-2 border-secondary/20 hover:border-secondary/40 hover:bg-secondary/5 hover:text-secondary transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
                    onClick={() => navigate(-1)}
                >
                    <ArrowLeft className="h-4 w-4 sm:h-4 sm:w-4 md:h-5 md:w-5 group-hover:-translate-x-1 transition-transform duration-300" />
                </Button>
                
                <div className="space-y-1.5 sm:space-y-2 md:space-y-3 px-12 sm:px-14 md:px-16 lg:px-0">
                    <div className="inline-block p-2.5 sm:p-3 md:p-4 bg-gradient-to-br from-primary/10 to-primary/20 rounded-xl sm:rounded-2xl shadow-lg">
                        <Smartphone className="h-6 w-6 sm:h-7 sm:w-7 md:h-8 md:w-8 lg:h-10 lg:w-10 text-primary" />
                    </div>
                    <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
                        Lesson 5: App UI Words
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base md:text-lg">Master app navigation vocabulary with confidence</p>
                </div>
            </div>

            {/* Enhanced Intro Card with Apple-style aesthetics */}
            <Card className="p-4 sm:p-5 md:p-6 lg:p-8 mb-4 sm:mb-6 md:mb-8 text-center bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-2 border-primary/20 rounded-xl sm:rounded-2xl shadow-xl sm:hover:shadow-2xl transition-all duration-500 sm:hover:-translate-y-1 overflow-hidden">
                <div className="inline-block p-3 sm:p-4 md:p-5 bg-gradient-to-br from-white to-gray-50 dark:from-gray-800 dark:to-gray-700 rounded-xl sm:rounded-2xl shadow-lg mb-2 sm:mb-3 md:mb-4">
                    <Smartphone className="h-8 w-8 sm:h-9 sm:w-9 md:h-10 md:w-10 lg:h-12 lg:w-12 text-primary" />
                </div>
                <h2 className="text-lg sm:text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100 mb-1.5 sm:mb-2">
                    App Navigation Words
                </h2>
                <p className="text-muted-foreground text-sm sm:text-base md:text-lg leading-relaxed max-w-2xl mx-auto">
                    Master the English words you'll encounter in app buttons and menus. Each word includes pronunciation and Urdu translation for better understanding.
                </p>
            </Card>

            {/* Enhanced Words List with Apple-style aesthetics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6 md:mb-8">
                {appUIWords.map((item, index) => (
                    <Card 
                        key={index} 
                        className="group p-3 sm:p-4 md:p-5 lg:p-6 flex items-center bg-gradient-to-br from-card to-card/50 dark:bg-card border-2 border-gray-200/50 dark:border-gray-700/50 rounded-xl sm:rounded-2xl shadow-lg sm:hover:shadow-2xl transition-all duration-500 sm:hover:-translate-y-2 sm:hover:scale-[1.02] overflow-hidden"
                    >
                        <div className="flex-1 space-y-1.5 sm:space-y-2 md:space-y-3">
                            <div className="flex items-center space-x-2 sm:space-x-2.5 md:space-x-3">
                                <div className={`p-2 sm:p-2.5 md:p-3 bg-gradient-to-br ${item.color} rounded-lg sm:rounded-xl shadow-md`}>
                                    <item.icon className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-white" />
                                </div>
                                <h3 className="text-base sm:text-lg md:text-xl lg:text-2xl font-bold text-gray-900 dark:text-gray-100">
                                    {item.word}
                                </h3>
                            </div>
                            <p className="font-urdu text-muted-foreground text-base sm:text-lg md:text-xl leading-relaxed pl-0 sm:pl-1">
                                {item.translation}
                            </p>
                        </div>
                        
                        <Button 
                            size="icon" 
                            className={`w-12 h-12 sm:w-13 sm:h-13 md:w-14 md:h-14 lg:w-16 lg:h-16 rounded-xl sm:rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 hover:scale-105 flex-shrink-0 ml-2 sm:ml-3 ${
                                loadingAudio === item.word 
                                    ? 'bg-primary/60 cursor-not-allowed' 
                                    : 'bg-gradient-to-br from-primary to-primary/90 hover:from-primary/90 hover:to-primary'
                            }`}
                            onClick={() => handlePlayAudio(item.word)}
                            disabled={loadingAudio === item.word}
                        >
                            {loadingAudio === item.word ? (
                                <div className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <Play className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
                            )}
                        </Button>
                    </Card>
                ))}
            </div>
            
            {/* Enhanced Completion Button with Apple-style aesthetics */}
            <Card className="p-3 sm:p-4 md:p-5 lg:p-6 bg-gradient-to-br from-primary/5 via-primary/10 to-secondary/5 border-2 border-primary/20 rounded-xl sm:rounded-2xl shadow-xl overflow-hidden">
                <Button 
                    size="lg" 
                    className="w-full h-14 sm:h-16 md:h-18 lg:h-20 text-base sm:text-lg md:text-xl bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary text-white font-semibold shadow-xl sm:hover:shadow-2xl transition-all duration-300 sm:hover:-translate-y-1 sm:hover:scale-[1.02] rounded-xl sm:rounded-2xl" 
                    onClick={() => navigate(-1)}
                >
                    <div className="flex items-center justify-center space-x-2 sm:space-x-3 md:space-x-4">
                        <div className="p-2 sm:p-2.5 md:p-3 bg-white/20 rounded-xl sm:rounded-2xl flex-shrink-0">
                            <PartyPopper className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 lg:w-8 lg:h-8" />
                        </div>
                        <div className="text-left">
                            <p className="font-bold text-sm sm:text-base md:text-lg">Complete Lesson</p>
                            <p className="text-[10px] sm:text-xs md:text-sm font-normal opacity-90 hidden xs:block">Excellent! You've mastered app navigation vocabulary!</p>
                        </div>
                    </div>
                </Button>
            </Card>
        </div>
    );
};

export default AppUIWordsLesson; 