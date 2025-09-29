// lib/usage.ts
import { License, Teacher, Usage, EventLog } from "./models";
import mongoose from "mongoose";

/**
 * Calculate upload limit based on teacher's profile
 * Formula: (testsPerTerm * 2 * classesCount) + 10
 */
export function calculateUploadLimit(
  testsPerTerm: number = 0,
  classesCount: number = 0
): number {
  // If teacher hasn't provided info, give minimum limit
  if (!testsPerTerm || !classesCount) {
    return 10; // Just the bonus
  }

  return testsPerTerm * 2 * classesCount + 10;
}

/**
 * Check if a license can perform an upload operation
 * Returns: { allowed: boolean, reason?: string, remainingUploads?: number }
 */
export async function checkUploadAllowed(licenseId: mongoose.Types.ObjectId) {
  const license = await License.findById(licenseId).populate("teacher");

  if (!license) {
    return { allowed: false, reason: "License not found" };
  }

  // Check if license is active
  if (license.status === "suspended") {
    return {
      allowed: false,
      reason: "License is suspended due to usage limit",
    };
  }

  if (license.status === "expired") {
    return { allowed: false, reason: "License has expired" };
  }

  // Check if limit is exceeded
  if (license.uploadCount >= license.uploadLimit) {
    return {
      allowed: false,
      reason: `Upload limit reached (${license.uploadLimit} uploads)`,
    };
  }

  const remainingUploads = license.uploadLimit - license.uploadCount;

  // Warn if getting close to limit (90% used)
  const usagePercentage = (license.uploadCount / license.uploadLimit) * 100;
  if (usagePercentage >= 90) {
    await EventLog.create({
      license: license._id,
      teacher: license.teacher,
      type: "license.usage_warning",
      message: `Usage at ${usagePercentage.toFixed(0)}% (${
        license.uploadCount
      }/${license.uploadLimit})`,
    });
  }

  return {
    allowed: true,
    remainingUploads,
    usagePercentage: Math.round(usagePercentage),
  };
}

/**
 * Record an upload operation and update counters
 */
export async function recordUpload(
  licenseId: mongoose.Types.ObjectId,
  teacherId: mongoose.Types.ObjectId,
  metadata?: {
    fileName?: string;
    fileSize?: number;
    rowCount?: number;
    ip?: string;
  }
) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Create usage record
    await Usage.create(
      [
        {
          license: licenseId,
          teacher: teacherId,
          operationType: "upload",
          timestamp: new Date(),
          metadata,
        },
      ],
      { session }
    );

    // Increment upload count
    const updatedLicense = await License.findByIdAndUpdate(
      licenseId,
      { $inc: { uploadCount: 1 } },
      { new: true, session }
    );

    if (!updatedLicense) {
      throw new Error("License not found");
    }

    // Check if limit reached and auto-suspend
    if (updatedLicense.uploadCount >= updatedLicense.uploadLimit) {
      await License.findByIdAndUpdate(
        licenseId,
        { status: "suspended" },
        { session }
      );

      await EventLog.create(
        [
          {
            license: licenseId,
            teacher: teacherId,
            type: "license.usage_limit_reached",
            message: `License auto-suspended: ${updatedLicense.uploadCount}/${updatedLicense.uploadLimit} uploads used`,
          },
        ],
        { session }
      );
    } else {
      // Log successful upload
      await EventLog.create(
        [
          {
            license: licenseId,
            teacher: teacherId,
            type: "upload.success",
            message: `Upload recorded: ${updatedLicense.uploadCount}/${updatedLicense.uploadLimit}`,
            metadata,
          },
        ],
        { session }
      );
    }

    await session.commitTransaction();

    return {
      success: true,
      uploadCount: updatedLicense.uploadCount,
      uploadLimit: updatedLicense.uploadLimit,
      remainingUploads: updatedLicense.uploadLimit - updatedLicense.uploadCount,
      suspended: updatedLicense.uploadCount >= updatedLicense.uploadLimit,
    };
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    session.endSession();
  }
}

/**
 * Get usage statistics for a license
 */
export async function getLicenseUsageStats(licenseId: mongoose.Types.ObjectId) {
  const license = await License.findById(licenseId);
  if (!license) {
    throw new Error("License not found");
  }

  const usageRecords = await Usage.find({ license: licenseId })
    .sort({ timestamp: -1 })
    .limit(100);

  const totalUploads = license.uploadCount;
  const limit = license.uploadLimit;
  const remaining = Math.max(0, limit - totalUploads);
  const usagePercentage = limit > 0 ? (totalUploads / limit) * 100 : 0;

  // Calculate daily usage for last 30 days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentUsage = await Usage.aggregate([
    {
      $match: {
        license: licenseId,
        timestamp: { $gte: thirtyDaysAgo },
      },
    },
    {
      $group: {
        _id: {
          $dateToString: { format: "%Y-%m-%d", date: "$timestamp" },
        },
        count: { $sum: 1 },
      },
    },
    { $sort: { _id: 1 } },
  ]);

  return {
    totalUploads,
    limit,
    remaining,
    usagePercentage: Math.round(usagePercentage),
    recentUploads: usageRecords,
    dailyUsage: recentUsage,
    status: license.status,
    isSuspended: license.status === "suspended",
  };
}

/**
 * Get usage statistics for all teachers (admin dashboard)
 */
export async function getAllUsageStats() {
  const licenses = await License.find()
    .populate("teacher", "fullName email classesCount testsPerTerm")
    .sort({ uploadCount: -1 });

  const stats = licenses.map((license) => {
    const teacher = license.teacher as any;
    return {
      licenseKey: license.key,
      teacherName: teacher?.fullName || "Unknown",
      teacherEmail: teacher?.email || "Unknown",
      uploadCount: license.uploadCount,
      uploadLimit: license.uploadLimit,
      remaining: Math.max(0, license.uploadLimit - license.uploadCount),
      usagePercentage: Math.round(
        (license.uploadCount / license.uploadLimit) * 100
      ),
      status: license.status,
      classesCount: teacher?.classesCount || 0,
      testsPerTerm: teacher?.testsPerTerm || 0,
    };
  });

  // Overall statistics
  const totalUploads = licenses.reduce((sum, l) => sum + l.uploadCount, 0);
  const totalLimit = licenses.reduce((sum, l) => sum + l.uploadLimit, 0);
  const activeLicenses = licenses.filter((l) => l.status === "active").length;
  const suspendedLicenses = licenses.filter(
    (l) => l.status === "suspended"
  ).length;

  return {
    licenses: stats,
    overall: {
      totalUploads,
      totalLimit,
      totalLicenses: licenses.length,
      activeLicenses,
      suspendedLicenses,
      averageUsagePercentage: Math.round((totalUploads / totalLimit) * 100),
    },
  };
}

/**
 * Update license limits when teacher updates their profile
 */
export async function updateLicenseLimits(
  teacherId: mongoose.Types.ObjectId,
  testsPerTerm: number,
  classesCount: number
) {
  const newLimit = calculateUploadLimit(testsPerTerm, classesCount);

  // Update all licenses for this teacher
  await License.updateMany({ teacher: teacherId }, { uploadLimit: newLimit });

  await EventLog.create({
    teacher: teacherId,
    type: "license.updated",
    message: `Upload limit updated to ${newLimit} based on new profile (${testsPerTerm} tests/term × 2 × ${classesCount} classes + 10)`,
  });

  return newLimit;
}
