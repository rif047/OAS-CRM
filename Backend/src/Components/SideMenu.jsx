import { NavLink } from "react-router-dom";
import SideMenuItem from "./SideMenuItem";

export default function SideMenu() {
    return (
        <aside className="flex h-auto w-full flex-col border-r border-white/10 bg-[#0f172a]/90 backdrop-blur-xl md:h-screen md:w-[250px]">
            <div className="flex h-14 items-center justify-between border-b border-white/10 bg-[#192032] px-4 backdrop-blur-sm md:h-16 md:px-8">
                <NavLink to={'/'}
                    className="select-none bg-linear-to-r from-[#f8fafc] via-[#e2e8f0] to-[#88bb99] bg-clip-text text-[18px] font-semibold tracking-wide text-transparent md:text-[22px]"
                >
                    KPCL Group
                </NavLink>

                <span className="select-none rounded-full border border-white/10 bg-white/10 px-2 py-[3px] text-[11px] font-medium tracking-wide text-gray-300 shadow-inner md:px-3 md:text-[12px]">
                    v{import.meta.env.VITE_VERSION}
                </span>
            </div>

            <div className="max-h-[60vh] flex-1 overflow-y-auto px-3 py-4 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent md:max-h-none md:py-5">
                <SideMenuItem />
            </div>

            <div className="relative hidden h-[55px] items-center justify-center overflow-hidden border-t border-white/10 bg-[#111827] text-[13px] font-medium text-gray-500 group md:flex">
                <span className="transition-all duration-300 group-hover:opacity-0 group-hover:-translate-y-2">
                    © 2025 KPCL Group
                </span>
                <span className="absolute transition-all duration-300 opacity-0 group-hover:opacity-100 group-hover:translate-y-0 translate-y-2 text-[#88bb99] font-semibold">
                    Cube In Cloud
                </span>
                <div className="absolute top-0 left-0 w-full h-px bg-linear-to-r from-transparent via-blue-400/30 to-transparent"></div>
            </div>
        </aside>
    );
}
