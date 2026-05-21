import Modal from '@mui/material/Modal';
import PaymentInfoCard from '../../Components/PaymentInfoCard';
import CloseIcon from '@mui/icons-material/Close';
import { formatCurrencyGBP, formatLondonDateTime } from '../../utils/formatters';
import { formatAssignees } from '../../utils/assignees';

export default function View({ open, onClose, viewData }) {
    const status = viewData?.status;
    const isPending = status === 'Pending';
    const isInQuote = status === 'In_Quote';
    const isInSurvey = status === 'In_Survey';
    const isInDesign = status === 'In_Design';
    const isInReview = status === 'In_Review';
    const isClosed = status === 'Closed';
    const isLost = status === 'Lost_Lead';

    return (
        <Modal open={open} onClose={onClose}>
            <div className="fixed inset-0 flex items-center justify-center p-2">
                <div className="fixed inset-0 bg-black/30" onClick={onClose} />

                <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex flex-col">
                    <div className="flex justify-between items-center px-5 py-1.5 border-b border-slate-200 bg-slate-100/95 mb-1">
                        <div>
                            <h2 className="text-[1.5rem] font-bold text-slate-800 leading-tight">Project Details</h2>
                            <p className="text-slate-600 mt-0.5 text-sm">{viewData?.leadCode || 'Loading...'}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors cursor-pointer">
                            <CloseIcon />
                        </button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3.5 md:p-4">
                        {!viewData ? (
                            <div className="flex items-center justify-center h-64">
                                <p className="text-gray-500">Loading details...</p>
                            </div>
                        ) : (
                            <div>
                                <div className="grid md:grid-cols-2 gap-3">
                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3 space-y-1">
                                        <h3 className="font-semibold text-base">📋 Timeline & Status</h3>

                                        <InfoRow label="Source" value={viewData.source} />
                                        <LinkRow label="Project Drive Files" url={viewData.file_link} linkText="Go to drive" />

                                        <div className="grid grid-cols-2 gap-2 mt-2.5 pt-3 border-t border-gray-300">
                                            <InfoRow label="👤 Client Name" value={viewData.client?.name} />
                                            <InfoRow label="📞 Phone" value={viewData.client?.phone || 'N/A'} />
                                            <InfoRow label="🏢 Client Company" value={viewData.client?.company || viewData.company || 'N/A'} />
                                            <InfoRow label="✉️ Email" value={viewData.client?.email || 'N/A'} />
                                        </div>

                                        <div className="grid grid-cols-2 gap-2 mt-2 pt-3 border-t border-gray-300">
                                            <InfoRow label="Agent" value={viewData.agent} />
                                            <InfoRow label="Status" value={viewData.status} />
                                            <InfoRow label="Created Date" value={formatLondonDateTime(viewData.createdAt)} />
                                            <InfoRow label="Updated Date" value={formatLondonDateTime(viewData.updatedAt)} />

                                            {isInQuote && <InfoRow label="Quote Sent Date" value={formatLondonDateTime(viewData.in_quote_date)} />}
                                            {isInSurvey && <InfoRow label="In Survey Date" value={formatLondonDateTime(viewData.in_survey_date)} />}
                                            {isInDesign && <InfoRow label="In Design Date" value={formatLondonDateTime(viewData.in_design_date)} />}
                                            {isInReview && <InfoRow label="In Review Date" value={formatLondonDateTime(viewData.in_review_date)} />}
                                            {isClosed && <InfoRow label="Closed Date" value={formatLondonDateTime(viewData.close_date)} />}
                                            {isLost && <InfoRow label="Lost Date" value={formatLondonDateTime(viewData.lost_date)} />}
                                            {(isInSurvey || isInReview || isInDesign || isClosed) && <InfoRow label="Surveyor" value={formatAssignees(viewData.surveyor)} />}
                                            {(isInSurvey || isInReview || isClosed) && <InfoRow label="Survey Date" value={formatLondonDateTime(viewData.survey_date)} />}
                                            {(isInSurvey || isClosed) && <InfoRow label="Survey Done" value={viewData.survey_done} />}
                                            {(isInDesign || isInReview || isClosed) && <InfoRow label="Designer" value={viewData.designer} />}
                                            {(isInDesign || isInReview || isClosed) && <InfoRow label="Design Deadline" value={formatLondonDateTime(viewData.design_deadline)} />}
                                        </div>
                                    </div>

                                    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-3">
                                        <h3 className="font-semibold text-base mb-3">🏠 Project Details</h3>

                                        <div className="mb-3">
                                            <InfoRow label="Project Address" value={viewData.address} />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 mb-3 py-2 border-y border-slate-300">
                                            {isPending && <InfoRow label="When To Start" value={viewData.when_to_start} />}
                                            {isPending && <InfoRow label="Budget" value={formatCurrencyGBP(viewData.budget)} />}
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <InfoRow label="Service Type" value={viewData.service_type} />
                                            <InfoRow label="Project Type" value={viewData.project_type} />

                                            {isPending && <InfoRow label="Need Planning Permission?" value={viewData.planning_permission} />}
                                            {isPending && <InfoRow label="Need Structural Services?" value={viewData.structural_services} />}
                                            {isPending && <InfoRow label="Need Interior Design?" value={viewData.interior_design} />}
                                            {isPending && <InfoRow label="Need Building Regulation Services?" value={viewData.building_regulation} />}
                                            {isPending && <InfoRow label="Did Select Builder?" value={viewData.select_builder} />}
                                            {isPending && <InfoRow label="Need Help In Project Management?" value={viewData.help_project_management} />}

                                            {(isInQuote || isClosed) && <InfoRow label="Quoted Price" value={formatCurrencyGBP(viewData.quote_price)} />}
                                            {(isInQuote || isClosed) && <LinkRow label="Quote File" url={viewData.quote_file} linkText="View" />}

                                            {(isInSurvey || isClosed) && <LinkRow label="Survey File" url={viewData.survey_file} linkText="View" />}
                                            {(isInReview || isClosed) && <LinkRow label="Design File" url={viewData.design_file} linkText="View" />}

                                            {isClosed && <InfoRow label="Final Price" value={formatCurrencyGBP(viewData.final_price)} />}
                                        </div>

                                        <div className="mt-2.5">
                                            <InfoRow
                                                label="Project Details Note"
                                                value={<div dangerouslySetInnerHTML={{ __html: viewData.project_details }} />}
                                            />
                                        </div>
                                    </div>
                                </div>

                                {(isInSurvey || isClosed) && (
                                    <div className="mt-4">
                                        <InfoCard title="💬 Survey Note">
                                            <div className="bg-slate-50 p-3.5 rounded-lg">
                                                <div
                                                    className="text-slate-700 text-[14px] leading-[1.5] description-view"
                                                    dangerouslySetInnerHTML={{
                                                        __html: viewData.survey_note || 'No description provided',
                                                    }}
                                                />
                                            </div>
                                        </InfoCard>
                                    </div>
                                )}

                                <PaymentInfoCard viewData={viewData} />

                                <div className="mt-4">
                                    <InfoCard title="💬 Description">
                                        <div className="bg-slate-50 p-3.5 rounded-lg">
                                            <div
                                                className="text-slate-700 text-[14px] leading-[1.5] description-view"
                                                dangerouslySetInnerHTML={{
                                                    __html: viewData.description || 'No description provided',
                                                }}
                                            />
                                        </div>
                                    </InfoCard>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="py-2 px-5 border-t border-slate-200 bg-slate-100">
                        <div className="flex justify-end">
                            <button onClick={onClose} className="px-7 py-1.5 bg-[#272e3f] text-white rounded-lg hover:bg-gray-700 transition cursor-pointer">
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
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm">
            <h3 className="text-base font-semibold text-slate-800 mb-3">{title}</h3>
            <div className="space-y-2">{children}</div>
        </div>
    );
}

function InfoRow({ label, value }) {
    const isElement = typeof value === 'object';
    const isCopyField = label?.includes('Phone') || label?.includes('Email');
    const textValue = typeof value === 'string' || typeof value === 'number' ? String(value) : '';
    const canCopy = !isElement && isCopyField && textValue && textValue !== 'N/A' && textValue !== 'Not provided';

    return (
        <div>
            <p className="text-[12px] text-slate-500 leading-tight">{label}</p>

            {isElement ? (
                <div className="font-medium text-slate-800 text-[14px] leading-snug">{value}</div>
            ) : canCopy ? (
                <button
                    type="button"
                    className="font-medium text-slate-800 text-[14px] leading-snug cursor-copy hover:text-blue-700"
                    title={`Click to copy: ${textValue}`}
                    onClick={() => navigator.clipboard?.writeText(textValue)}
                >
                    {textValue}
                </button>
            ) : (
                <p className="font-medium text-slate-800 text-[14px] leading-snug">
                    {value || <span className="text-gray-400">Not provided</span>}
                </p>
            )}
        </div>
    );
}

function LinkRow({ label, url, linkText = 'Go to link' }) {
    const normalizedUrl = typeof url === 'string' ? url.trim() : '';
    if (!normalizedUrl) return <InfoRow label={label} value="Not provided" />;

    const fullUrl = normalizedUrl.startsWith('http') ? normalizedUrl : 'https://' + normalizedUrl;

    return (
        <div>
            <p className="text-[12px] text-slate-500 leading-tight">{label}</p>
            <a href={fullUrl} target="_blank" rel="noreferrer" className="text-blue-700 hover:text-blue-900 hover:underline font-medium text-[14px]">
                {linkText}
                <span className="ml-2">↗</span>
            </a>
        </div>
    );
}
