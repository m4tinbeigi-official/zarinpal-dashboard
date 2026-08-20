"use client";
import type { Metadata } from "@/lib/types";

export default function MethodologyPanel({
  metadata, onClose,
}: { metadata: Metadata; onClose: () => void }) {
  const m = metadata.methodology;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-bold text-zp-navy">روش محاسبه و منبع داده</h2>
          <button onClick={onClose} className="text-muted hover:text-zp-navy text-xl">✕</button>
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
            <p className="font-bold text-xs text-zp-warning mb-1">⚠ هشدار کارمزد</p>
            <p>{m.adjustedFee}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">شناسایی مشتری</p>
            <p>{m.customerIdentifier}</p>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">اطلاعات دیتاست</p>
            <ul className="space-y-1 text-xs text-muted">
              <li>تعداد ردیف: {metadata.totalRows.toLocaleString()}</li>
              <li>بازه: {metadata.dateRange.min} تا {metadata.dateRange.max}</li>
              <li>پذیرندگان: {metadata.merchantCount}</li>
              <li>دسته‌ها: {metadata.categoryCount}</li>
              <li>ردیف‌های رد شده: {metadata.skippedRows}</li>
              <li>زمان تولید: {metadata.generatedAt}</li>
            </ul>
          </div>

          <div className="bg-gray-50 rounded-xl p-3">
            <p className="font-bold text-xs text-muted mb-1">حریم خصوصی</p>
            <ul className="space-y-1 text-xs">
              <li>• شناسه کارت خام هرگز در UI نمایش داده نمی‌شود</li>
              <li>• بنچ‌مارک صنفی فقط تجمیعی است و شناسه رقیب افشا نمی‌شود</li>
              <li>• دسته‌هایی با کمتر از ۳ پذیرنده از مقایسه حذف می‌شوند</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
