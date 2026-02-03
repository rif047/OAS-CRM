import Modal from '@mui/material/Modal';
import CloseIcon from '@mui/icons-material/Close';

export default function View({ open, onClose, viewData }) {
    const loggedUser = JSON.parse(localStorage.getItem('user'));


    return (
        <Modal open={open} onClose={onClose}>
            <div className="fixed inset-0 flex items-center justify-center p-2">
                <div className="fixed inset-0 bg-black/30" onClick={onClose} />

                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center px-8 py-2 border-b bg-gray-200 mb-2">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">
                                Project Details
                            </h2>
                            <p className="text-gray-600 mt-1">
                                {viewData?.leadCode || "Loading..."}
                            </p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors cursor-pointer">
                            <CloseIcon />
                        </button>
                    </div>



                    <div className="flex-1 overflow-y-auto p-6">
                        {!viewData ? (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-gray-500">Loading details...</p>
                            </div>
                        ) : (
                            <div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="bg-white rounded-lg border border-gray-200 shadow p-4 space-y-2">
                                        <h3 className="font-semibold text-lg">📋 Lead Details</h3>
                                        <InfoRow label="Company" value={viewData.company} />
                                        <InfoRow label="Source" value={viewData.source} />
                                        <div className="grid grid-cols-2 gap-3 mt-2 pt-4 border-t border-gray-300">
                                            <InfoRow label="Agent" value={viewData.agent} />
                                            <InfoRow label="Status" value={viewData.status} />
                                            <InfoRow label="Created Date" value={formatDate(viewData.createdAt)} />
                                            <InfoRow label="Updated Date" value={formatDate(viewData.updatedAt)} />
                                            <InfoRow label="In Servey Date" value={formatDate(viewData.in_survey_date)} />


                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border border-gray-200 shadow p-4">
                                        <h3 className="font-semibold text-lg mb-4">🏠 Project Details</h3>

                                        <div className="grid grid-cols-2 gap-3 mb-4 py-2 border-b border-gray-300">
                                            <InfoRow label="👤 Client Name" value={viewData.client?.name} />
                                            <InfoRow label="📞 Phone" value={viewData.client?.phone} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <InfoRow label="Project Address" value={viewData.address} />
                                            <InfoRow label="Property Type" value={viewData.service_type} />
                                            <InfoRow label="Project Type" value={viewData.project_type} />
                                            <InfoRow label="Scope Of Work" value={viewData.project_details} />
                                            <InfoRow label="Surveyor" value={viewData.surveyor} />
                                            <InfoRow label="Survey Date" value={formatDate(viewData.survey_date)} />
                                            <InfoRow label="Survey Done" value={viewData.survey_done} />
                                            <LinkRow label="Survey File" url={viewData.survey_file} linkText="View" />
                                        </div>
                                    </div>
                                </div>



                                <div className='mt-6'>
                                    <InfoCard title="💬 Survey Note">
                                        <div className="bg-gray-50 p-4 rounded-lg">
                                            <div
                                                className="text-gray-700 description-view"
                                                dangerouslySetInnerHTML={{
                                                    __html: viewData.survey_note || "No description provided"
                                                }}
                                            />
                                        </div>
                                    </InfoCard>
                                </div>

                                {(loggedUser?.userType === "Admin" || loggedUser?.userType === "Management") && (
                                    <div className='mt-6'>
                                        <InfoCard title="💬 Description">
                                            <div className="bg-gray-50 p-4 rounded-lg">
                                                <div
                                                    className="text-gray-700 description-view"
                                                    dangerouslySetInnerHTML={{
                                                        __html: viewData.description || "No description provided"
                                                    }}
                                                />
                                            </div>
                                        </InfoCard>
                                    </div>
                                )}

                            </div>
                        )}
                    </div>

                    <div className="py-2 px-6 border-t bg-gray-100">
                        <div className="flex justify-end">
                            <button onClick={onClose} className="px-10 py-2 bg-[#272e3f] text-white rounded-lg hover:bg-gray-700 transition cursor-pointer" >
                                Close
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    );
}

function InfoCard({ title, children }) {
    return (
        <div className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">{title}</h3>
            <div className="space-y-3">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }) {
    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="font-medium text-gray-800">
                {value || <span className="text-gray-400">Not provided</span>}
            </p>
        </div>
    );
}

function LinkRow({ label, url, linkText = "Go to link" }) {
    if (!url) return <InfoRow label={label} value="Not provided" />;

    const fullUrl = url.startsWith('http') ? url : `https://${url}`;

    return (
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <a
                href={fullUrl}
                target="_blank"
                rel="noreferrer"
                className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
                {linkText}
                <span className="ml-2">↗</span>
            </a>
        </div>
    );
}


function formatDate(dateString) {
    if (!dateString) return 'N/A';

    return new Date(dateString).toLocaleString('en-GB', {
        timeZone: 'Europe/London',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
    });
}