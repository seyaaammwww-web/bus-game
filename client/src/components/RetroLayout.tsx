import React from 'react';
import './RetroStyles.css';

const RetroBackground = () => {
    return (
        <div className="hero-background w-full top-0 left-0 absolute pointer-events-none">
            <div className="hero-background-static-dots"></div>
            <div className="hero-background-static-piece" style={{ height: '48px', backgroundColor: 'var(--hero-piece-1)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '48px', backgroundColor: 'var(--hero-piece-2)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '84px', backgroundColor: 'var(--hero-piece-3)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-4)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-5)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-6)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-7)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-8)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-9)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-10)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-11)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '96px', backgroundColor: 'var(--hero-piece-12)' }}></div>
            <div className="hero-background-static-piece" style={{ height: '112px', backgroundColor: 'var(--hero-piece-13)' }}></div>
        </div>
    );
};

const RetroHeader = () => {
    return (
        <div className="header py-24 px-32 fixed top-0 left-0 w-full z-20 flex justify-between items-center">
            <div className="flex gap-4 items-center cursor-pointer">
                <a aria-label="WorkOS" href="#" className="w-48 h-48 flex items-center justify-center group">
                    <div className="w-36 h-36 relative">
                        <svg fill="none" height="36" viewBox="0 0 36 36" width="36" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 -z-10">
                            <path d="M31 2V1H30H6H5V2V5H2H1V6V30V31H2H5V34V35H6H30H31V34V31H34H35V30V6V5H34H31V2Z" fill="white" stroke="#1C073E" strokeWidth="2" style={{ fill: 'white', fillOpacity: 1, stroke: '#1C073E', strokeOpacity: 1 }}></path>
                        </svg>
                        <svg fill="none" height="18" viewBox="0 0 18 18" width="18" xmlns="http://www.w3.org/2000/svg" className="mt-7 mx-auto group-active:translate-y-2">
                            <path clipRule="evenodd" d="M10.5 1.5H7.5V3H6V4.5H4.5V6H3V7.5H1.5V9H3V16.5H8.25V12H9.75V16.5H15V9H16.5V7.5H15V6H13.5V4.5H12V3H10.5V1.5ZM10.5 3V4.5H12V6H13.5V7.5H15V9H13.5V15H11.25V10.5H6.75V15H4.5V9H3V7.5H4.5V6H6V4.5H7.5V3H10.5Z" fill="#721CE0" fillRule="evenodd"></path>
                        </svg>
                    </div>
                </a>
                <div className="text-[12px] leading-[24px] uppercase tracking-[-0.96px] min-w-30 hidden md:block text-[inherit] transition-all">WorkOS</div>
            </div>

            <div className="flex gap-8">
                <div className="flex gap-4 items-center cursor-pointer header-filter">
                    {/* Filter Button Placeholder */}
                    <button aria-label="Off" className="w-48 h-48 flex items-center justify-center group">
                        <div className="w-36 h-36 relative">
                            <svg fill="none" height="36" viewBox="0 0 36 36" width="36" xmlns="http://www.w3.org/2000/svg" className="absolute top-0 left-0 -z-10">
                                <path d="M31 2V1H30H6H5V2V5H2H1V6V30V31H2H5V34V35H6H30H31V34V31H34H35V30V6V5H34H31V2Z" fill="white" stroke="#1C073E" strokeWidth="2"></path>
                            </svg>
                            <div className="text-black text-xs font-bold mt-2 font-mono">OFF</div>
                        </div>
                    </button>
                    <div className="text-[12px] leading-[24px] tracking-[-0.96px] min-w-30 hidden md:block text-[inherit] transition-all">Off</div>
                </div>
            </div>
        </div>
    );
};

const RetroHeroContent = () => {
    return (
        <div className="relative pt-112 w-full flex flex-col items-center">
            <div style={{ '--shadow': '3px' } as React.CSSProperties} className="relative uppercase text text-[#E5ADFF] text-[32px] mb-8">
                <div className="text-original mx-auto w-max">WorkOS</div>
            </div>

            {/* Canvas Placeholder */}
            <div className="max-w-640 px-16 relative mx-auto w-full h-[368px] border-2 border-dashed border-white/30 flex items-center justify-center text-white/50 bg-black/20">
                <div className="text-center">
                    <p className="font-mono text-sm">Interactive Pixel Canvas</p>
                    <p className="text-xs mt-2 opacity-70">(Requires JS physics engine)</p>
                </div>
            </div>
        </div>
    )
}

const RetroGiveaway = () => {
    return (
        <div className="giveaway relative px-20 overflow-hidden pt-40 pb-56 w-full max-w-[800px] mx-auto">
            <div style={{ '--shadow': '3px' } as React.CSSProperties} className="relative uppercase text text-[#ffd5ad] text-[32px] leading-[40px] mt-58 mb-26 text-center">
                <div className="text-original mx-auto w-max">Giveaway</div>
            </div>

            {/* Crown Icon */}
            <div className="flex justify-center mb-4">
                <svg fill="none" height="44" viewBox="0 0 44 44" width="44" xmlns="http://www.w3.org/2000/svg" className="relative z-10 w-44 h-44">
                    <path d="M4 4H20V8H24V4H40V28H32V32H28V40H16V32H12V28H4V4Z" fill="#FFE8AD"></path>
                    <rect fill="#350D7A" height="4" width="8" x="36" transform="scale(-1, 1)" style={{ transformOrigin: 'center' }}></rect>
                    {/* Simplified details for visual similarity */}
                    <rect fill="#350D7A" height="4" width="4" x="28" y="4" transform="scale(-1, 1)" style={{ transformOrigin: 'center' }}></rect>
                    <rect fill="#FFFDD1" height="4" width="8" x="36" y="4" transform="scale(-1, 1)" style={{ transformOrigin: 'center' }}></rect>
                </svg>
            </div>

            <div className="giveaway-notice text-center py-9 px-23 mt-62 max-w-500 mx-auto relative before:inside-border before:!border-3 before:border-[#350D7A] bg-[#FFFDD1] text-[#350D7A]">
                <div className="relative text-[12px] leading-[24px] tracking-[-0.96px]">
                    One lucky subscriber won an <strong className="mx-4 font-bold">Analogue Pocket.</strong>
                    Keep an eye out for more giveaways!
                </div>

                {/* Corner Decoration SVGs */}
                <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="top-0 left-0 absolute text-[#FFFEF0]">
                    <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
                    <rect fill="#350D7A" height="3" width="7" x="8"></rect>
                    <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
                </svg>
                <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="top-0 right-0 absolute rotate-90 text-[#FFFEF0]">
                    <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
                    <rect fill="#350D7A" height="3" width="7" x="8"></rect>
                    <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
                </svg>
                <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="bottom-0 left-0 absolute -rotate-90 text-[#FFE8AD]">
                    <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
                    <rect fill="#350D7A" height="3" width="7" x="8"></rect>
                    <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
                </svg>
                <svg fill="none" height="15" viewBox="0 0 15 15" width="15" xmlns="http://www.w3.org/2000/svg" className="bottom-0 right-0 absolute rotate-180 text-[#FFE8AD]">
                    <rect fill="var(--hero-piece-15)" height="15" width="15"></rect>
                    <rect fill="#350D7A" height="3" width="7" x="8"></rect>
                    <rect fill="currentColor" height="4" width="4" x="11" y="3"></rect>
                </svg>
            </div>

            {/* Arrows */}
            <div className="focus-arrows absolute w-full h-full top-0 left-0 pointer-events-none opacity-50">
                {/* Left Arrow */}
                <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg" className="absolute top-1/2 left-[10%] -translate-y-1/2">
                    <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#FFFDD1"></path>
                    <rect fill="#350D7A" height="10" width="2" y="4"></rect>
                    <rect fill="#350D7A" height="2" width="2" x="2" y="2"></rect>
                    <rect fill="#350D7A" height="2" width="2" x="2" y="14"></rect>
                    <rect fill="#350D7A" height="2" width="2" x="22" y="8"></rect>
                    <rect fill="#350D7A" height="2" width="6" x="4"></rect>
                    <rect fill="#350D7A" height="2" width="6" x="4" y="16"></rect>
                </svg>
                {/* Right Arrow */}
                <svg fill="none" height="18" viewBox="0 0 24 18" width="24" xmlns="http://www.w3.org/2000/svg" className="absolute top-1/2 right-[10%] -translate-y-1/2 rotate-180">
                    <path d="M14 2H2V16H14V12H22V6H14V2Z" fill="#FFFDD1"></path>
                    <rect fill="#350D7A" height="10" width="2" y="4"></rect>
                    <rect fill="#350D7A" height="2" width="2" x="2" y="2"></rect>
                    <rect fill="#350D7A" height="2" width="2" x="2" y="14"></rect>
                    <rect fill="#350D7A" height="2" width="2" x="22" y="8"></rect>
                    <rect fill="#350D7A" height="2" width="6" x="4"></rect>
                    <rect fill="#350D7A" height="2" width="6" x="4" y="16"></rect>
                </svg>
            </div>
        </div>
    )
}

export const RetroLayout = () => {
    return (
        <div className="min-h-screen relative overflow-x-hidden font-mono text-white bg-background">
            <RetroBackground />
            <div className="relative z-10 w-full pb-20">
                <RetroHeader />
                <RetroHeroContent />
                <RetroGiveaway />
                <div className="h-[200px]"></div> {/* Spacer */}
            </div>
        </div>
    );
};

export default RetroLayout;

