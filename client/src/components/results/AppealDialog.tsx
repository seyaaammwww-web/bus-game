import { AlertTriangle } from 'lucide-react';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface AppealDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    itemName?: string;
    categoryName?: string;
    isVotingEnabled?: boolean;
}

export function AppealDialog({ isOpen, onClose, onConfirm, itemName, categoryName, isVotingEnabled }: AppealDialogProps) {
    return (
        <AlertDialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <AlertDialogContent className="bg-[#FFFDD1] border-[4px] border-[#4c1d95] rounded-none shadow-[8px_8px_0_0_#2e1065]">
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-2xl font-bold font-pixel-title text-[#4c1d95] flex items-center gap-2">
                        <AlertTriangle className="w-6 h-6 text-[#ef4444]" />
                        ظلموني؟ 🤨
                    </AlertDialogTitle>
                    <AlertDialogDescription className="text-lg font-bold font-pixel-text text-[#7c3aed]">
                        متأكد إن "{itemName}" كلمة صحيحة في فئة "{categoryName}"؟
                        <br />
                        <span className="text-sm text-[#4c1d95]/70 block mt-2">
                            {isVotingEnabled
                                ? "(الناس هي الي هتحكم، وريهم شطارتك!)"
                                : "(هنسأل الكمبيوتر ولو ليك حق هتاخده متخافش)"}
                        </span>
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="gap-3">
                    <AlertDialogCancel
                        onClick={onClose}
                        className="bg-white border-2 border-[#4c1d95] text-[#4c1d95] font-bold font-pixel-text hover:bg-gray-100 rounded-none h-12"
                    >
                        خلاص مش متأكد
                    </AlertDialogCancel>
                    <AlertDialogAction
                        onClick={onConfirm}
                        className="bg-white border-2 border-[#4c1d95] text-[#4c1d95] font-bold font-pixel-text hover:bg-[#f3e8ff] rounded-none h-12 shadow-[2px_2px_0_0_#2e1065]"
                    >
                        أيوه متأكد! 😤
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
