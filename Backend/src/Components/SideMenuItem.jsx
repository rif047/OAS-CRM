import { NavLink } from "react-router-dom";
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
    PreviewTwoTone
} from "@mui/icons-material";

export default function SideMenu() {
    const userType = localStorage.getItem("userType");

    const MenuItem = ({ to, icon: Icon, label }) => (
        <NavLink
            to={to}
            className={({ isActive }) =>
                `flex items-center gap-3 px-4 py-2.5 rounded-lg transition-all duration-300 ${isActive
                    ? "bg-linear-to-r from-[#88bb99] to-[#3a4259] text-white shadow-md"
                    : "text-gray-400 hover:text-white hover:bg-[#3a4259]/80"
                }`
            }
        >
            <Icon fontSize="small" />
            <span className="text-[15px] font-medium">{label}</span>
        </NavLink>
    );

    return (
        <nav className="space-y-1">
            <p className="text-xs font-semibold text-gray-500 ml-4 uppercase tracking-wider mb-2">
                Main
            </p>
            <MenuItem to="/" icon={DashboardOutlined} label="Dashboard" />


            {(userType === "Admin" || userType === "Management") && (
                <>
                    <MenuItem to="/clients" icon={PeopleTwoTone} label="Clients" />
                    <MenuItem to="/leads" icon={WorkHistoryTwoTone} label="Leads" />
                    <MenuItem to="/in_quote" icon={RequestQuoteTwoTone} label="In Quotation" />
                </>
            )}



            {(userType === "Admin" || userType === "Management" || userType === "Surveyor") && (
                <MenuItem to="/in_survey" icon={TourTwoTone} label="Site Survey" />
            )}



            {(userType === "Admin" || userType === "Management" || userType === "Designer") && (
                <MenuItem to="/in_design" icon={DesignServices} label="Project Phase" />
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
                    <div className="pt-3 border-t border-gray-700/60 mt-3"></div>
                    <p className="text-xs font-semibold text-gray-500 ml-4 uppercase tracking-wider mb-2 mt-4">
                        Admin
                    </p>
                    <MenuItem to="/managements" icon={AdminPanelSettingsTwoTone} label="Management" />
                    <MenuItem to="/surveyors" icon={AdminPanelSettingsTwoTone} label="Surveyors" />
                    <MenuItem to="/designers" icon={ContactsTwoTone} label="Designers" />
                </>
            )}


            {(userType === "Admin") && (
                <>
                    <MenuItem to="/users" icon={ManageAccountsTwoTone} label="Users" />
                    <MenuItem to="/settings" icon={SettingsOutlined} label="Settings" />
                </>
            )}
        </nav>
    );
}
