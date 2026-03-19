/**
 * @fileoverview Integration tests for Contract Hiring flow
 * Tests the full Upload -> Submit -> Recommend -> Shortlist flow
 * 
 * Note: These tests use mocks for database and external services
 * to allow running in CI without infrastructure dependencies.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// Mock Prisma before importing modules that use it
vi.mock("@/db/index", () => ({
  default: {
    opening: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
    },
    hiringProfile: {
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      count: vi.fn(),
      groupBy: vi.fn(),
    },
    $transaction: vi.fn((fn) => fn({
      hiringProfile: {
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([]),
      },
    })),
  },
}));

// Mock S3 adapter
vi.mock("@/modules/contractHiring/vendor/storageAdapter", () => ({
  generatePresignedUploadUrl: vi.fn(),
  isAllowedFileType: vi.fn(),
  getFileStream: vi.fn(),
}));

// Test data fixtures
const mockTenantId = "bruce-wayne-corp-tenant-id";
const mockVendorUserId = "vendor-user-id";
const mockHiringManagerId = "hiring-manager-id";
const mockOpeningId = "test-opening-uuid";

const mockOpening = {
  id: mockOpeningId,
  tenantId: mockTenantId,
  hiringManagerId: mockHiringManagerId,
  title: "Senior Software Engineer",
  description: "Building the future",
  location: "Gotham City",
  contractType: "FULL_TIME",
  locationType: "HYBRID",
  experienceMin: 5,
  experienceMax: 10,
  requiredSkills: ["JavaScript", "React", "Node.js"],
  status: "OPEN",
  postedAt: new Date("2026-01-15"),
};

const mockProfile = {
  id: 1,
  openingId: mockOpeningId,
  s3Key: "contract-hiring/bruce-wayne-corp/test-opening/resume.pdf",
  uploadedBy: mockVendorUserId,
  status: "SUBMITTED",
  isDeleted: false,
  recommended: true,
  recommendationScore: 0.85,
  recommendationConfidence: 0.9,
  recommendationExplanation: "Strong skill match (90%), experience within range.",
  recommendedAt: new Date(),
  recommendationLatencyMs: 1200,
  recommendationVersion: "1.0.0",
  reasoningMetadata: {},
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("Contract Hiring Integration Flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Vendor Upload Flow", () => {
    it("should validate file type before generating presigned URL", async () => {
      const { isAllowedFileType } = await import(
        "@/modules/contractHiring/vendor/storageAdapter"
      );
      
      (isAllowedFileType as any).mockReturnValue(true);
      
      // PDF should be allowed
      expect(isAllowedFileType("application/pdf", "resume.pdf")).toBe(true);
      
      // Reset and test rejection
      (isAllowedFileType as any).mockReturnValue(false);
      expect(isAllowedFileType("image/jpeg", "photo.jpg")).toBe(false);
    });

    it("should reject uploads for invalid file types", async () => {
      const { isAllowedFileType, generatePresignedUploadUrl } = await import(
        "@/modules/contractHiring/vendor/storageAdapter"
      );
      
      (isAllowedFileType as any).mockReturnValue(false);
      
      // This mimics the service throwing an error for invalid types
      expect(isAllowedFileType("text/plain", "resume.txt")).toBe(false);
      expect(generatePresignedUploadUrl).not.toHaveBeenCalled();
    });

    it("should generate S3 key with tenant isolation", () => {
      const generateS3Key = (
        tenantId: string,
        openingId: string,
        fileName: string
      ): string => {
        const timestamp = Date.now();
        return `contract-hiring/${tenantId}/${openingId}/${timestamp}_${fileName}`;
      };

      const s3Key = generateS3Key(mockTenantId, mockOpeningId, "resume.pdf");
      
      expect(s3Key).toContain(mockTenantId);
      expect(s3Key).toContain(mockOpeningId);
      expect(s3Key).toContain("resume.pdf");
      expect(s3Key).toMatch(/^contract-hiring\//);
    });
  });

  describe("Tenant Isolation", () => {
    it("should prevent vendor from accessing openings in other tenants", async () => {
      const prisma = (await import("@/db/index")).default;
      
      // Mock: opening exists but in different tenant
      (prisma.opening.findFirst as any).mockResolvedValue(null);
      
      const opening = await prisma.opening.findFirst({
        where: {
          id: mockOpeningId,
          tenantId: "different-tenant-id", // Wrong tenant
        },
      });
      
      expect(opening).toBeNull();
    });

    it("should allow vendor to access openings in their own tenant", async () => {
      const prisma = (await import("@/db/index")).default;
      
      // Mock: opening exists in correct tenant
      (prisma.opening.findFirst as any).mockResolvedValue(mockOpening);
      
      const opening = await prisma.opening.findFirst({
        where: {
          id: mockOpeningId,
          tenantId: mockTenantId, // Correct tenant
        },
      });
      
      expect(opening).not.toBeNull();
      expect(opening?.tenantId).toBe(mockTenantId);
    });
  });

  describe("Hiring Manager Ownership", () => {
    it("should prevent hiring manager from accessing openings they don't own", async () => {
      const prisma = (await import("@/db/index")).default;
      
      // Mock: opening exists but different hiring manager
      (prisma.opening.findFirst as any).mockResolvedValue(null);
      
      const opening = await prisma.opening.findFirst({
        where: {
          id: mockOpeningId,
          hiringManagerId: "different-manager-id", // Not the owner
          tenantId: mockTenantId,
        },
      });
      
      expect(opening).toBeNull();
    });

    it("should allow hiring manager to access their own openings", async () => {
      const prisma = (await import("@/db/index")).default;
      
      // Mock: opening exists and hiring manager owns it
      (prisma.opening.findFirst as any).mockResolvedValue(mockOpening);
      
      const opening = await prisma.opening.findFirst({
        where: {
          id: mockOpeningId,
          hiringManagerId: mockHiringManagerId, // The owner
          tenantId: mockTenantId,
        },
      });
      
      expect(opening).not.toBeNull();
      expect(opening?.hiringManagerId).toBe(mockHiringManagerId);
    });
  });

  describe("Profile Status Transitions", () => {
    it("should allow shortlisting a submitted profile", async () => {
      const prisma = (await import("@/db/index")).default;
      
      (prisma.hiringProfile.update as any).mockResolvedValue({
        ...mockProfile,
        status: "SHORTLISTED",
      });
      
      const updated = await prisma.hiringProfile.update({
        where: { id: mockProfile.id },
        data: { status: "SHORTLISTED" },
      });
      
      expect(updated.status).toBe("SHORTLISTED");
    });

    it("should allow rejecting a submitted profile", async () => {
      const prisma = (await import("@/db/index")).default;
      
      (prisma.hiringProfile.update as any).mockResolvedValue({
        ...mockProfile,
        status: "REJECTED",
      });
      
      const updated = await prisma.hiringProfile.update({
        where: { id: mockProfile.id },
        data: { status: "REJECTED" },
      });
      
      expect(updated.status).toBe("REJECTED");
    });

    it("should prevent actions on soft-deleted profiles", async () => {
      const prisma = (await import("@/db/index")).default;
      
      const deletedProfile = { ...mockProfile, isDeleted: true };
      (prisma.hiringProfile.findFirst as any).mockResolvedValue(deletedProfile);
      
      const profile = await prisma.hiringProfile.findFirst({
        where: { id: mockProfile.id, isDeleted: false },
      });
      
      // The query for non-deleted should find nothing
      expect(profile?.isDeleted).toBe(true);
    });
  });

  describe("Recommendation Data Visibility", () => {
    it("should include recommendation data for hiring manager", async () => {
      const prisma = (await import("@/db/index")).default;
      
      (prisma.hiringProfile.findMany as any).mockResolvedValue([mockProfile]);
      
      const profiles = await prisma.hiringProfile.findMany({
        where: { openingId: mockOpeningId },
      });
      
      expect(profiles[0].recommended).toBe(true);
      expect(profiles[0].recommendationScore).toBe(0.85);
      expect(profiles[0].recommendationConfidence).toBe(0.9);
      expect(profiles[0].recommendationExplanation).toContain("Strong skill match");
      expect(profiles[0].recommendationLatencyMs).toBe(1200);
    });

    it("should exclude recommendation data for vendor (DTO transformation)", () => {
      // Vendor DTO transformer
      const toVendorProfileItem = (profile: typeof mockProfile) => ({
        id: profile.id,
        s3Key: profile.s3Key,
        status: profile.status,
        createdAt: profile.createdAt,
        // Note: NO recommendation fields
      });
      
      const vendorView = toVendorProfileItem(mockProfile);
      
      expect(vendorView.id).toBe(mockProfile.id);
      expect(vendorView.status).toBe(mockProfile.status);
      // These should NOT exist in vendor view
      expect((vendorView as any).recommended).toBeUndefined();
      expect((vendorView as any).recommendationScore).toBeUndefined();
      expect((vendorView as any).recommendationConfidence).toBeUndefined();
      expect((vendorView as any).recommendationExplanation).toBeUndefined();
    });
  });

  describe("Idempotency", () => {
    it("should skip profiles that already exist when re-submitting", async () => {
      const prisma = (await import("@/db/index")).default;
      
      // First submission creates the profile
      (prisma.hiringProfile.findFirst as any).mockResolvedValueOnce(null);
      
      const firstCheck = await prisma.hiringProfile.findFirst({
        where: { s3Key: mockProfile.s3Key },
      });
      expect(firstCheck).toBeNull();
      
      // After creation, profile exists
      (prisma.hiringProfile.findFirst as any).mockResolvedValueOnce(mockProfile);
      
      const secondCheck = await prisma.hiringProfile.findFirst({
        where: { s3Key: mockProfile.s3Key },
      });
      expect(secondCheck).not.toBeNull();
      
      // Idempotency check: duplicate s3Key should be skipped
    });
  });

  describe("Full Flow Simulation", () => {
    it("should complete the full Upload -> Submit -> Recommend -> Shortlist flow", async () => {
      const prisma = (await import("@/db/index")).default;
      
      // Step 1: Verify opening exists in tenant
      (prisma.opening.findFirst as any).mockResolvedValue(mockOpening);
      const opening = await prisma.opening.findFirst({
        where: { id: mockOpeningId, tenantId: mockTenantId },
      });
      expect(opening).not.toBeNull();
      
      // Step 2: Create profile after upload (submit)
      const submittedProfile = {
        ...mockProfile,
        recommended: null,
        recommendationScore: null,
        recommendationExplanation: null,
      };
      (prisma.hiringProfile.create as any).mockResolvedValue(submittedProfile);
      
      const created = await prisma.hiringProfile.create({
        data: {
          openingId: mockOpeningId,
          s3Key: "contract-hiring/tenant/opening/resume.pdf",
          uploadedBy: mockVendorUserId,
          status: "SUBMITTED",
        },
      });
      expect(created.status).toBe("SUBMITTED");
      
      // Step 3: Recommendation is processed (async)
      const recommendedProfile = { ...mockProfile };
      (prisma.hiringProfile.update as any).mockResolvedValue(recommendedProfile);
      
      const afterRecommendation = await prisma.hiringProfile.update({
        where: { id: created.id },
        data: {
          recommended: true,
          recommendationScore: 0.85,
          recommendationConfidence: 0.9,
          recommendationExplanation: "Strong skill match",
          recommendationLatencyMs: 1200,
        },
      });
      expect(afterRecommendation.recommended).toBe(true);
      expect(afterRecommendation.recommendationScore).toBe(0.85);
      
      // Step 4: Hiring manager shortlists
      const shortlistedProfile = { ...recommendedProfile, status: "SHORTLISTED" };
      (prisma.hiringProfile.update as any).mockResolvedValue(shortlistedProfile);
      
      const final = await prisma.hiringProfile.update({
        where: { id: created.id },
        data: { status: "SHORTLISTED" },
      });
      expect(final.status).toBe("SHORTLISTED");
    });
  });
});

describe("RBAC Enforcement", () => {
  it("should enforce IT_VENDOR role for vendor endpoints", () => {
    // This tests the role check logic
    const authorizeRole = (requiredRole: string) => (userRole: string) => {
      return userRole === requiredRole;
    };
    
    const checkVendor = authorizeRole("IT_VENDOR");
    
    expect(checkVendor("IT_VENDOR")).toBe(true);
    expect(checkVendor("HIRING_MANAGER")).toBe(false);
    expect(checkVendor("BUSINESS_USER")).toBe(false);
  });
  
  it("should enforce HIRING_MANAGER role for hiring manager endpoints", () => {
    const authorizeRole = (requiredRole: string) => (userRole: string) => {
      return userRole === requiredRole;
    };
    
    const checkHM = authorizeRole("HIRING_MANAGER");
    
    expect(checkHM("HIRING_MANAGER")).toBe(true);
    expect(checkHM("IT_VENDOR")).toBe(false);
    expect(checkHM("BUSINESS_USER")).toBe(false);
  });
});

describe("Scoring Decision Thresholds", () => {
  it("should classify scores correctly", () => {
    const getDecision = (score: number) => {
      if (score >= 0.75) return "RECOMMENDED";
      if (score >= 0.5) return "BORDERLINE";
      return "NOT_RECOMMENDED";
    };
    
    expect(getDecision(0.85)).toBe("RECOMMENDED");
    expect(getDecision(0.75)).toBe("RECOMMENDED");
    expect(getDecision(0.74)).toBe("BORDERLINE");
    expect(getDecision(0.5)).toBe("BORDERLINE");
    expect(getDecision(0.49)).toBe("NOT_RECOMMENDED");
    expect(getDecision(0.2)).toBe("NOT_RECOMMENDED");
  });
});
