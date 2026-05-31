import { useTranslation } from 'react-i18next';

/**
 * Confirmation modal for destructive actions.
 * Renders nothing when `open` is false.
 */
export default function ConfirmModal({
  open,
  title,
  message,
  onConfirm,
  onCancel,
  confirmLabel,
  danger = true,
}) {
  const { t } = useTranslation();
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-gray-800">
          {title || t('common.confirm')}
        </h3>
        <p className="mt-2 text-sm text-gray-600">
          {message || t('common.confirmDelete')}
        </p>
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-gray-600 transition-colors hover:bg-gray-100"
          >
            {t('common.cancel')}
          </button>
          <button
            onClick={onConfirm}
            className={`cursor-pointer rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
              danger ? 'bg-red-600 hover:bg-red-700' : 'bg-primary hover:bg-primary-600'
            }`}
          >
            {confirmLabel || t('common.confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}
