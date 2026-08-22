"use client";
import type { Metadata } from "@/lib/types";

export default function MethodologyPanel({
  metadata, onClose,
}: { metadata: Metadata; onClose: () => void }) {
  const m = metadata.methodology;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="bg-white rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="methodology-title"
      >
        <div className="flex justify-between items-center sticky -top-6 -mt-6 -mx-6 px-6 pt-6 pb-3 bg-white/95 backdrop-blur border-b border-border">
          <h2 id="methodology-title" className="text-lg font-bold text-zp-navy">روش محاسبه و منبع داده</h2>
          <button
            onClick={onClose}
            aria-label="بستن پنجره"
            className="w-8 h-8 flex items-center justify-center rounded-full text-muted hover:text-zp-navy hover:bg-gray-100 transition text-lg"
          >
            ✕
          </button>
        </div>

        <div className="space-y-3 text-sm">
          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">تعریف خرید موفق</p>
            <p>{m.successDefinition}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">واحد پولی</p>
            <p>{m.currency}</p>
          </div>

          <div className="bg-zp-warning/10 rounded-xl p-3">
            <p className="font-bold text-xs text-zp-warning mb-1">⚠ هشدار درباره کارمزد</p>
            <p>{m.adjustedFee}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">روش شناسایی مشتری</p>
            <p>{m.customerIdentifier}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">درباره مجموعه‌داده</p>
            <ul className="space-y-1 text-xs text-muted">
              <li>تعداد رکورد خام: {metadata.totalRows.toLocaleString()}</li>
              <li>بازه زمانی: {metadata.dateRange.min} تا {metadata.dateRange.max}</li>
              <li>تعداد پذیرندگان: {metadata.merchantCount}</li>
              <li>تعداد دسته‌های صنفی: {metadata.categoryCount}</li>
              <li>رکوردهای نامعتبر حذف‌شده: {metadata.skippedRows}</li>
              <li>زمان تولید گزارش: {metadata.generatedAt}</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">حریم خصوصی</p>
            <ul className="space-y-1 text-xs">
              <li>• شناسه خام کارت هیچ‌گاه در رابط کاربری نمایش داده نمی‌شود</li>
              <li>• بنچ‌مارک صنفی فقط به‌صورت تجمیعی است و هویت رقبا فاش نمی‌شود</li>
              <li>• دسته‌های صنفی با کمتر از ۳ پذیرنده از مقایسه کنار گذاشته می‌شوند</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
