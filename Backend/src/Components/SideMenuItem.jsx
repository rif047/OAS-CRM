import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    DashboardOutlined,
    PeopleTwoTone,
    MarginTwoTone,
    CheckBoxTwoTone,
    WorkHistoryTwoTone,
    CancelPresentationTwoTone,
    ApiTwoTone,
    TourTwoTone,
    RequestQuoteTwoTone,
    PreviewTwoTone,
    AdminPanelSettingsTwoTone,
    ContactsTwoTone,
    ManageAccountsTwoTone,
    SettingsOutlined,
    ExpandMore,
    ExpandLess,
    ManageSearchTwoTone
} from "@mui/icons-material";

export default function SideMenu() {
    const userType = localStorage.getItem("userType");
    const [open, setOpen] = useState(false);

    const MenuItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${isActive
                    ? "bg-gradient-to-r from-[#88bb99] to-[#3a4259] text-white shadow-md"
                    : "text-gray-400 hover:text-white hover:bg-[#3a4259]/80"
                }`
            }
        >
            <Icon fontSize="small" />
            <span className="text-[15px] font-medium">{label}</span>
        </NavLink>
    );

    const SubMenu = ({ title, icon: Icon, children }) => {
        const paths = children.map((child) => child.props.to);
        const location = useLocation();

        useEffect(() => {
            if (paths.some((p) => location.pathname.startsWith(p))) setOpen(true);
        }, [location.pathname]);

        return (
            <>
                <div
                    onClick={() => setOpen(!open)}
                    className={`flex items-center justify-between px-4 py-2.5 rounded-lg cursor-pointer transition-all duration-300 ${open
                        ? "bg-[#3a4259]/70 text-white"
                        : "text-gray-400 hover:text-white hover:bg-[#3a4259]/60"
                        }`}
                >
                    <div className="flex items-center gap-3">
                        <Icon fontSize="small" />
                        <span className="text-[15px] font-medium">{title}</span>
                    </div>
                    {open ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                </div>
                <div
                    className={`ml-6 mt-1 space-y-1 border-l border-gray-700 pl-3 transition-all duration-500 overflow-hidden ${open ? "max-h-40 opacity-100" : "max-h-0 opacity-0"
                        }`}
                >
                    {children}
                </div>
            </>
        );
    };

    return (
        <nav className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 ml-4 uppercase tracking-wider mb-2">
                Main
            </p>

            {(userType === "Admin" || userType === "Management") && (
                <>
                    <MenuItem to="/" icon={DashboardOutlined} label="Dashboard" />
                    <MenuItem to="/clients" icon={PeopleTwoTone} label="Clients" />
                    <MenuItem to="/leads" icon={WorkHistoryTwoTone} label="Leads" />
                    <MenuItem to="/in_quote" icon={RequestQuoteTwoTone} label="In Quotation" />
                    <MenuItem to="/in_servey" icon={TourTwoTone} label="Site Servey" />
                </>
            )}

            <SubMenu title="Project Overflow" icon={MarginTwoTone}>
                <MenuItem to="/in_design" icon={ApiTwoTone} label="In Design" />
                <MenuItem to="/in_review" icon={PreviewTwoTone} label="In Review" />
            </SubMenu>

            {(userType === "Admin" || userType === "Management") && (
                <>
                    <MenuItem to="/closed" icon={CheckBoxTwoTone} label="Closed" />
                    <MenuItem to="/lost_leads" icon={CancelPresentationTwoTone} label="Lost Leads" />
                </>
            )}




            {(userType === "Admin" || userType === "Management") && (
                <>
                    <div className="pt-3 border-t border-gray-700/60 mt-3"></div>
                    <p className="text-xs font-semibold text-gray-500 ml-4 uppercase tracking-wider mb-2 mt-4">
                        Admin
                    </p>
                    <MenuItem to="/project_report" icon={ManageSearchTwoTone} label="Project Report" />
                    <MenuItem to="/managements" icon={AdminPanelSettingsTwoTone} label="Management" />
                    <MenuItem to="/designers" icon={ContactsTwoTone} label="Designers" />
                    <MenuItem to="/users" icon={ManageAccountsTwoTone} label="Users" />
                    <MenuItem to="/settings" icon={SettingsOutlined} label="Settings" />
                </>
            )}

        </nav>
    );
}
