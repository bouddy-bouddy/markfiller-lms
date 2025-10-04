"use client";

import { useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Check, X, Camera, Loader2 } from "lucide-react";

export default function MobileUploadPage() {
  const params = useParams();
  const sessionId = params.sessionId as string;

  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setError("يرجى اختيار صورة بصيغة JPEG أو PNG أو WebP");
      return;
    }

    // Validate file size (10MB)
    if (file.size > 10 * 1024 * 1024) {
      setError("حجم الصورة يجب أن يكون أقل من 10 ميجابايت");
      return;
    }

    setSelectedImage(file);
    setError(null);

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleUpload = async () => {
    if (!selectedImage) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("image", selectedImage);

      const response = await fetch("/api/qr-upload/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "فشل في رفع الصورة");
      }

      setUploadSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "حدث خطأ أثناء رفع الصورة");
    } finally {
      setUploading(false);
    }
  };

  const handleReset = () => {
    setSelectedImage(null);
    setPreviewUrl(null);
    setUploadSuccess(false);
    setError(null);
  };

  if (uploadSuccess) {
    return (
      <div
        className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4"
        dir="rtl"
      >
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-gray-900">
                تم رفع الصورة بنجاح!
              </h2>
              <p className="text-gray-600">
                يمكنك الآن العودة إلى برنامج Excel للمتابعة
              </p>
              <Button
                onClick={handleReset}
                variant="outline"
                className="w-full"
              >
                رفع صورة أخرى
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4"
      dir="rtl"
    >
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle className="text-center text-2xl">
            رفع صورة لائحة النقط
          </CardTitle>
          <p className="text-center text-sm text-gray-600 mt-2">
            قم بتحميل صورة واضحة للائحة النقط
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Image Selection Area */}
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-green-500 transition-colors"
            onClick={() => fileInputRef.current?.click()}
          >
            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview"
                  className="max-h-64 mx-auto rounded-lg"
                />
                <p className="text-sm text-gray-600">{selectedImage?.name}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleReset();
                  }}
                >
                  <X className="w-4 h-4 ml-2" />
                  إزالة الصورة
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="mx-auto w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center">
                  <Camera className="w-8 h-8 text-gray-400" />
                </div>
                <div>
                  <p className="text-gray-700 font-medium">انقر لاختيار صورة</p>
                  <p className="text-sm text-gray-500 mt-1">
                    أو استخدم الكاميرا لالتقاط صورة
                  </p>
                </div>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp"
            capture="environment"
            className="hidden"
            onChange={handleImageSelect}
          />

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Upload Button */}
          <Button
            onClick={handleUpload}
            disabled={!selectedImage || uploading}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {uploading ? (
              <>
                <Loader2 className="w-5 h-5 ml-2 animate-spin" />
                جاري الرفع...
              </>
            ) : (
              <>
                <Upload className="w-5 h-5 ml-2" />
                رفع الصورة
              </>
            )}
          </Button>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              <strong>نصائح للحصول على أفضل النتائج:</strong>
            </p>
            <ul className="text-sm text-blue-700 mt-2 space-y-1 list-disc list-inside">
              <li>تأكد من وضوح الصورة وعدم وجود ظلال</li>
              <li>التقط الصورة من الأعلى مباشرة</li>
              <li>تأكد من إضاءة جيدة</li>
              <li>احرص على ظهور كامل اللائحة في الصورة</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
