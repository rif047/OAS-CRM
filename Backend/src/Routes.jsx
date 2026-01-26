import { useState, useEffect } from "react";
import { Routes, Route, Navigate } from 'react-router-dom';
import axios from 'axios';
import Login from './Pages/Auth/Login';
import Dashboard from './Pages/Dashboard/Dashboard';
import Clients from './Pages/Client/Clients';
import Leads from './Pages/Lead/Leads';
import In_Quote from './Pages/Lead/In_Quote/In_Quote';
import In_Survey from './Pages/Lead/In_Survey/In_Survey';
import Project_Phase from './Pages/Lead/Project_Phase/Project_Phase';
import In_Review from './Pages/Lead/In_Review/In_Review';
import Closed from './Pages/Lead/Closed/Closed';
import Lost_Lead from './Pages/Lead/Lost_Lead/Lost_Lead';
import Managements from './Pages/User/Management/Managements';
import Surveyors from './Pages/User/Surveyor/Surveyors';
import Designers from './Pages/User/Designer/Designers';
import Users from './Pages/User/Users';
import Settings from './Pages/Setting/Settings';

export default function MainRoutes() {
    const [loggedIn, setLoggedIn] = useState(false);
    const [userType, setUserType] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const token = localStorage.getItem("token");
        const role = localStorage.getItem("userType");

        if (token) {
            try {
                const { exp } = JSON.parse(atob(token.split('.')[1]));
                if (exp * 1000 > Date.now()) {
                    axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
                    setLoggedIn(true);
                    setUserType(role);
                } else {
                    localStorage.removeItem("token");
                    localStorage.removeItem("userType");
                }
            } catch (error) {
                localStorage.removeItem("token");
                localStorage.removeItem("userType");
            }
        }

        setLoading(false);
    }, []);

    const handleLogout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("userType");
        setLoggedIn(false);
        delete axios.defaults.headers.common['Authorization'];
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <Routes>
            <Route path="/" element={loggedIn ? <Dashboard handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/login" element={loggedIn ? <Navigate to="/" replace /> : <Login setLoggedIn={setLoggedIn} />} />
            <Route path="/in_design" element={loggedIn ? <Project_Phase handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
            <Route path="/in_survey" element={loggedIn ? <In_Survey handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />


            {(userType === "Admin" || userType === "Management") && (
                <>
                    <Route path="/leads" element={loggedIn ? <Leads handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/in_quote" element={loggedIn ? <In_Quote handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/in_review" element={loggedIn ? <In_Review handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/closed" element={loggedIn ? <Closed handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/lost_lead" element={loggedIn ? <Lost_Lead handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/clients" element={loggedIn ? <Clients handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/managements" element={loggedIn ? <Managements handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/designers" element={loggedIn ? <Designers handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/surveyors" element={loggedIn ? <Surveyors handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                </>
            )}

            {(userType === "Admin") && (
                <>
                    <Route path="/users" element={loggedIn ? <Users handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                    <Route path="/settings" element={loggedIn ? <Settings handleLogout={handleLogout} /> : <Navigate to="/login" replace />} />
                </>
            )}


            <Route path="*" element={<Navigate to={loggedIn ? "/" : "/login"} replace />} />
        </Routes>
    );
}
