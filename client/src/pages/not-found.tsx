import { RetroCard } from "@/components/ui/RetroCard";
import { CornerStuds, MiniBus, BusDivider } from "@/components/ui/PixelDetails";

export default function NotFound() {
  return (
    <div className="min-h-screen p-4 flex items-center justify-center font-pixel-text">
      <RetroCard className="w-full max-w-md relative z-10 text-center">
        <CornerStuds />

        {/* Flickering broken bus-stop sign */}
        <div className="pw-flicker inline-flex flex-col items-center mb-4" aria-hidden="true">
          <div className="bg-[#350D7A] border-[3px] border-[#350D7A] rounded-sm px-4 py-2 shadow-pixel-sm">
            <span className="font-pixel-title text-3xl text-[#FFC48B]">404</span>
          </div>
          {/* Sign post */}
          <div className="w-2 h-8 bg-[#350D7A]" />
        </div>

        <h1 className="text-2xl font-pixel-title text-[#350D7A] mb-2">المحطة دي مش موجودة!</h1>
        <p className="text-[#350D7A]/60 mb-1">الصفحة دي غير موجودة في خط الأتوبيس بتاعنا.</p>
        <p className="text-[#350D7A]/60 text-sm">
          يمكن الأتوبيس عدى من هنا زمان<span className="pw-dots" />
        </p>

        {/* Lost mini bus driving across the card */}
        <BusDivider className="my-5" />

        <a
          href="/"
          className="inline-flex items-center gap-2 bg-[#6714A8] text-[#FFFEE2] border-[3px] border-[#350D7A] rounded-sm px-5 py-2.5 font-pixel-title text-sm shadow-pixel hover:bg-[#7A1FC4] active:translate-x-[2px] active:translate-y-[2px] active:shadow-pixel-sm transition-none"
        >
          <span className="pw-float inline-flex" aria-hidden="true">
            <MiniBus size={22} />
          </span>
          ارجع للمحطة الرئيسية
        </a>
      </RetroCard>
    </div>
  );
}
