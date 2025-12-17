import { NavLink } from "react-router-dom";
import SideMenuItem from "./SideMenuItem";

export default function SideMenu() {
    return (
        <aside className="w-full md:w-[250px] h-screen bg-[#0f172a]/90 backdrop-blur-xl border-r border-white/10 flex flex-col">
            <div className="h-16 flex items-center justify-between px-8 bg-[#192032] border-b border-white/10 backdrop-blur-sm">
                <NavLink to={'/'}
                    className="text-[22px] font-semibold tracking-wide bg-linear-to-r from-[#f8fafc] via-[#e2e8f0] to-[#88bb99] bg-clip-text text-transparent select-none"
                >
                    KPCL Group
                </NavLink>

                <span className="px-3 py-[3px] rounded-full bg-white/10 text-gray-300 text-[12px] font-medium tracking-wide border border-white/10 shadow-inner select-none">
                    v{import.meta.env.VITE_VERSION}
                </span>
            </div>




            <div className="flex-1 overflow-y-auto px-3 py-5 scrollbar-thin scrollbar-thumb-gray-700 scrollbar-track-transparent">
                <SideMenuItem />
            </div>

            <div className="h-[55px] relative bg-[#111827] border-t border-white/10 flex items-center justify-center text-[13px] font-medium text-gray-500 overflow-hidden group">
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
