import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { setMasterVolume, muteAll, unmuteAll } from './sounds';

type SoundContextType = {
    isMuted: boolean;
    masterVolume: number;
    toggleMute: () => void;
    setVolume: (v: number) => void;
};

const SoundContext = createContext<SoundContextType | null>(null);

export function SoundProvider({ children }: { children: ReactNode }) {
    const [isMuted, setIsMuted] = useState(false);
    const [masterVolume, setMasterVol] = useState(0.8);

    const toggleMute = () => {
        const newMute = !isMuted;
        setIsMuted(newMute);
        if (newMute) muteAll(); else unmuteAll();
        localStorage.setItem('busSoundMuted', newMute.toString());
    };

    const setVolume = (v: number) => {
        setMasterVol(v);
        setMasterVolume(v);
        localStorage.setItem('busSoundVolume', v.toString());
    };

    // Restore from localStorage
    useEffect(() => {
        const savedMute = localStorage.getItem('busSoundMuted') === 'true';
        const savedVol = parseFloat(localStorage.getItem('busSoundVolume') || '0.8');
        setIsMuted(savedMute);
        setMasterVol(savedVol);
        setMasterVolume(savedVol);
        if (savedMute) muteAll();
    }, []);

    return (
        <SoundContext.Provider value={{ isMuted, masterVolume, toggleMute, setVolume }}>
            {children}
        </SoundContext.Provider>
    );
}

// eslint-disable-next-line react-refresh/only-export-components
export const useGameSound = () => {
    const context = useContext(SoundContext);
    if (!context) {
        throw new Error('useGameSound must be used within a SoundProvider');
    }
    return context;
};
