import { Card, CardContent } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { RetroCard } from "@/components/ui/RetroCard";

export default function NotFound() {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center font-pixel-text">
      <RetroCard className="w-full max-w-md relative z-10 text-center">
        <div className="flex mb-4 gap-2 justify-center">
          <AlertCircle className="h-8 w-8 text-red-500" />
        </div>
        <h1 className="text-2xl font-pixel-title text-[#31093A] mb-2">404 Page Not Found</h1>
        <p className="text-[#31093A]/60">الصفحة دي غير موجودة في الأتوبيس بتاعنا.</p>
        <div className="mt-6">
          <a href="/" className="text-primary hover:underline font-bold">ارجع للرئيسية</a>
        </div>
      </RetroCard>
    </div>
  );
}
