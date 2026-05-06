import { createElement, useEffect, useMemo, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import {
    DashboardOutlined,
    PeopleTwoTone,
    CheckBoxTwoTone,
    WorkHistoryTwoTone,
    CancelPresentationTwoTone,
    TourTwoTone,
    RequestQuoteTwoTone,
    AdminPanelSettingsTwoTone,
    ContactsTwoTone,
    ManageAccountsTwoTone,
    SettingsOutlined,
    DesignServices,
    PreviewTwoTone,
    PaymentsTwoTone,
    SummarizeTwoTone,
    ExpandMore,
    ChevronRight
} from "@mui/icons-material";

export default function SideMenu() {
    const userType = localStorage.getItem("userType");
    const location = useLocation();

    const reportsRoutes = useMemo(
        () => ["/income", "/reports/due-history", "/reports/project-history", "/reports/monthly-report"],
        []
    );

    const isReportsActive = reportsRoutes.includes(location.pathname);
    const [reportsOpen, setReportsOpen] = useState(isReportsActive);

    useEffect(() => {
        if (isReportsActive) {
            setReportsOpen(true);
        }
    }, [isReportsActive]);

    const MenuItem = ({ to, icon, label, inset = false }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg transition-all duration-200 ${inset ? "ml-2" : ""} ${isActive
                    ? "bg-linear-to-r from-[#88bb99] to-[#3a4259] text-white"
                    : "text-gray-400 hover:text-white hover:bg-[#3a4259]/65"
                }`
            }
        >
            {({ isActive }) => (
                <>
                    <span
                        className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-sm transition-all duration-200 ${isActive ? "bg-white/90 opacity-100" : "opacity-0 group-hover:opacity-60 bg-white/60"
                            }`}
                    />

                    <span
                        className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${isActive
                            ? "border-white/20 bg-white/15 text-white"
                            : "border-white/10 bg-[#111827]/25 text-gray-400 group-hover:border-white/15 group-hover:text-white"
                            }`}
                    >
                        {icon ? createElement(icon, { sx: { fontSize: 18 } }) : null}
                    </span>

                    <span className="truncate text-[13.5px] font-normal tracking-[0.01em] leading-4">{label}</span>
                </>
            )}
        </NavLink>
    );

    return (
        <nav className="space-y-1">
            <p className="ml-2.5 mb-2 text-[10px] font-medium uppercase tracking-[0.13em] text-gray-500/90">
                Main
            </p>
            {(userType === "Admin" || userType === "Management") && (
                <MenuItem to="/" icon={DashboardOutlined} label="Dashboard" />
            )}


            {(userType === "Admin" || userType === "Management") && (
                <>
                    <MenuItem to="/clients" icon={PeopleTwoTone} label="Clients" />
                    <MenuItem to="/leads" icon={WorkHistoryTwoTone} label="Pending Leads" />
                    <MenuItem to="/in_quote" icon={RequestQuoteTwoTone} label="In Quotation" />
                </>
            )}



            {(userType === "Admin" || userType === "Management" || userType === "Surveyor") && (
                <MenuItem to="/in_survey" icon={TourTwoTone} label="Site Survey" />
            )}



            {(userType === "Admin" || userType === "Management" || userType === "Designer") && (
                <MenuItem to="/in_design" icon={DesignServices} label="Drawing Phase" />
            )}




            {(userType === "Admin" || userType === "Management") && (
                <>
                    <MenuItem to="/in_review" icon={PreviewTwoTone} label="Under Review" />
                    <MenuItem to="/closed" icon={CheckBoxTwoTone} label="Closed" />
                    <MenuItem to="/lost_lead" icon={CancelPresentationTwoTone} label="Lost Lead" />
                </>
            )}



            {(userType === "Admin" || userType === "Management") && (
                <>
                    <div className="mx-1 mt-2.5 border-t border-gray-700/60 pt-2.5" />
                    <p className="ml-2.5 mb-2 mt-1 text-[10px] font-medium uppercase tracking-[0.13em] text-gray-500/90">
                        Admin
                    </p>
                    {/* <MenuItem to="/managements" icon={AdminPanelSettingsTwoTone} label="Management" />
                    <MenuItem to="/surveyors" icon={AdminPanelSettingsTwoTone} label="Surveyors" />
                    <MenuItem to="/designers" icon={ContactsTwoTone} label="Architect" /> */}
                    <MenuItem to="/all-projects" icon={WorkHistoryTwoTone} label="All Projects" />

                    <button
                        type="button"
                        onClick={() => setReportsOpen((prev) => !prev)}
                        className={`group relative flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-left transition-all duration-200 ${isReportsActive
                            ? "bg-linear-to-r from-[#88bb99] to-[#3a4259] text-white"
                            : "text-gray-400 hover:bg-[#3a4259]/65 hover:text-white"
                            }`}
                    >
                        <span
                            className={`absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r-sm transition-all duration-200 ${isReportsActive ? "bg-white/90 opacity-100" : "opacity-0 group-hover:opacity-60 bg-white/60"
                                }`}
                        />
                        <span
                            className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md border transition-all duration-200 ${isReportsActive
                                ? "border-white/20 bg-white/15 text-white"
                                : "border-white/10 bg-[#111827]/25 text-gray-400 group-hover:border-white/15 group-hover:text-white"
                                }`}
                        >
                            {createElement(SummarizeTwoTone, { sx: { fontSize: 18 } })}
                        </span>
                        <span className="truncate text-[13.5px] font-normal tracking-[0.01em] leading-4">Reports</span>
                        <span className="ml-auto inline-flex items-center justify-center">
                            {reportsOpen ? <ExpandMore sx={{ fontSize: 18 }} /> : <ChevronRight sx={{ fontSize: 18 }} />}
                        </span>
                    </button>

                    <div
                        className={`overflow-hidden transition-all duration-300 ease-out ${reportsOpen
                            ? "max-h-72 opacity-100 mt-1 translate-y-0"
                            : "max-h-0 opacity-0 mt-0 -translate-y-1"
                            }`}
                    >
                        <div className="space-y-1 pb-0.5">
                            <MenuItem to="/income" icon={PaymentsTwoTone} label="Income & Due" inset />
                            <MenuItem to="/reports/project-history" icon={WorkHistoryTwoTone} label="Project History" inset />
                            <MenuItem to="/reports/monthly-report" icon={SummarizeTwoTone} label="Monthly Report" inset />
                        </div>
                    </div>
                </>
            )}


            {(userType === "Admin" || userType === "Management") && (
                <>
                    <MenuItem to="/users" icon={ManageAccountsTwoTone} label="Users" />
                </>
            )}

            {(userType === "Admin") && (
                <>
                    <MenuItem to="/settings" icon={SettingsOutlined} label="Database" />
                </>
            )}
        </nav>
    );
}
